import { ref } from 'vue'
import { characterStore, type ChatMessage } from '../stores/characterStore'
import { isLoggedIn, getUser } from '@shared/composables/useAuth'

const AUTH_BASE = 'https://grandand.com'

export function useChat(characterId: string, systemPrompt: string) {
  const messages = ref<ChatMessage[]>(characterStore.getHistory(characterId))
  const isStreaming = ref(false)
  const error = ref<string | null>(null)

  /** 发送消息（流式） */
  async function send(userContent: string) {
    if (!userContent.trim() || isStreaming.value) return

    error.value = null

    // 鉴权检查
    if (!isLoggedIn()) {
      error.value = '请先登录'
      return
    }
    const user = getUser() as any
    let childId: string | null = null
    try {
      const profile = localStorage.getItem('grandkidsgo_active_profile')
      if (profile) {
        const p = JSON.parse(profile)
        childId = p.id
      }
    } catch {}
    if (!childId) {
      childId = user?.id || null
    }
    if (!childId) {
      error.value = '请先选择孩子档案'
      return
    }

    // 添加 user 消息
    const userMsg: ChatMessage = { role: 'user', content: userContent.trim(), ts: Date.now() }
    messages.value.push(userMsg)
    characterStore.addMessage(characterId, userMsg)

    // 流式请求
    isStreaming.value = true
    let assistantContent = ''

    try {
      const token = sessionStorage.getItem('grandkidsgo_token') || ''
      const resp = await fetch(`${AUTH_BASE}/api/llm/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          messages: messages.value
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-20)
            .map(m => ({ role: m.role, content: m.content })),
          systemPrompt,
          childId
        })
      })

      if (!resp.ok) {
        const errText = await resp.text()
        error.value = `请求失败: ${resp.status} ${errText.slice(0, 100)}`
        isStreaming.value = false
        return
      }

      const reader = resp.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const json = JSON.parse(payload)
            if (json.error) {
              error.value = json.message || '生成失败'
              continue
            }
            if (json.delta) {
              assistantContent += json.delta
              // 触发响应式更新：直接修改 messages 最后一条的 content（占位）
              // 简化做法：每次覆盖最后一条
              const last = messages.value[messages.value.length - 1]
              if (last && last.role === 'assistant' && last.content === '__streaming__') {
                last.content = assistantContent
              } else if (last && last.role === 'user') {
                messages.value.push({ role: 'assistant', content: assistantContent, ts: Date.now() })
              }
            }
          } catch {}
        }
      }

      // 流结束：保存 assistant 消息
      if (assistantContent) {
        // 移除占位 / 替换最后一条
        const last = messages.value[messages.value.length - 1]
        if (last && last.role === 'assistant') {
          last.content = assistantContent
          characterStore.addMessage(characterId, last)
        }
      }
    } catch (e: any) {
      error.value = e.message || '网络错误'
    } finally {
      isStreaming.value = false
    }
  }

  function clearHistory() {
    characterStore.clearHistory(characterId)
    messages.value = []
  }

  return {
    messages,
    isStreaming,
    error,
    send,
    clearHistory
  }
}