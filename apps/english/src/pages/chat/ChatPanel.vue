<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { getCharacter, type Character } from '../../config/characters'
import { characterStore } from '../../stores/characterStore'
import { studyStore } from '../../stores/studyStore'
import { useChat } from '../../composables/useChat'
import { highlightEn } from '../../utils/highlightEn'
import { router } from '../../router'
import { isLoggedIn } from '@shared/composables/useAuth'

const props = defineProps<{
  characterId: string
}>()

const character = computed<Character | null>(() => getCharacter(props.characterId))
const displayName = computed(() => character.value
  ? characterStore.getDisplayName(character.value.id, character.value.defaultName)
  : 'AI 朋友'
)

// 命名弹窗
const showNamingModal = ref(false)
const namingInput = ref('')

onMounted(() => {
  // 首次进入某角色 → 弹命名弹窗
  if (character.value && !characterStore.hasCustomName(character.value.id)) {
    showNamingModal.value = true
    namingInput.value = ''
  }
  characterStore.setLastCharacterId(props.characterId)
  // 累计 AI 对话时长
  characterStore.startChatSession(props.characterId)
  // 若有最近学习单词，自动发首条 user 消息
  if (studyStore.lastSession && studyStore.lastSession.words.length > 0) {
    const lastMsg = messages.value[messages.value.length - 1]
    if (!lastMsg) {
      const words = studyStore.lastSession.words.slice(0, 3).join(', ')
      setTimeout(() => send(`我们刚学了 ${words}，你能跟我聊聊吗？`), 500)
    }
  }
})

onBeforeUnmount(() => {
  // 累加本次对话时长
  characterStore.endChatSession(props.characterId)
})

function confirmNaming() {
  if (!character.value) return
  const name = namingInput.value.trim()
  if (!name) return
  if (name.length > 10) {
    alert('名字最多 10 个字')
    return
  }
  characterStore.setCustomName(character.value.id, name)
  showNamingModal.value = false
}

function useDefaultName() {
  if (character.value) {
    characterStore.setCustomName(character.value.id, '')
  }
  showNamingModal.value = false
}

function reopenNaming() {
  if (!character.value) return
  namingInput.value = characterStore.getDisplayName(character.value.id, character.value.defaultName)
  showNamingModal.value = true
}

const { messages, isStreaming, error, send, clearHistory } = useChat(
  props.characterId,
  character.value?.systemPrompt || ''
)

const inputText = ref('')
const messagesEl = ref<HTMLElement | null>(null)

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  await send(text)
  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

function clearChat() {
  if (confirm('确定要清空对话记录吗？')) {
    clearHistory()
  }
}

function back() {
  router.navigate('chat')
}

const color = computed(() => character.value?.color || 'var(--color-primary)')
</script>

<template>
  <div class="chat-panel" :style="{ '--char-color': color }">
    <!-- 顶部 -->
    <header class="header">
      <button class="back-btn" @click="back">←</button>
      <div class="header-info" @click="reopenNaming">
        <div class="char-avatar-small">{{ character?.emojiLabel?.[0] || '?' }}</div>
        <div>
          <div class="char-name">{{ displayName }}</div>
          <div class="char-tag">点击改名</div>
        </div>
      </div>
      <button class="clear-btn" @click="clearChat">清空</button>
    </header>

    <!-- 对话流 -->
    <div class="messages" ref="messagesEl">
      <div v-if="messages.length === 0" class="empty">
        <p>开始跟 {{ displayName }} 聊天吧~</p>
      </div>

      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="['message', msg.role]"
      >
        <div class="bubble" v-html="highlightEn(msg.content)"></div>
      </div>

      <div v-if="isStreaming" class="message assistant">
        <div class="bubble bubble--typing">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <textarea
        v-model="inputText"
        @keydown.enter.exact.prevent="sendMessage"
        placeholder="说点什么吧~"
        class="input"
        rows="1"
        :disabled="isStreaming"
      ></textarea>
      <button class="send-btn" @click="sendMessage" :disabled="!inputText.trim() || isStreaming">
        发送
      </button>
    </div>

    <!-- 命名弹窗 -->
    <div v-if="showNamingModal" class="naming-modal" @click.self="useDefaultName">
      <div class="naming-card">
        <div class="char-avatar-big">{{ character?.emojiLabel }}</div>
        <h2 class="naming-title">给 ta 起个名字吧</h2>
        <p class="naming-sub">最多 10 个字</p>
        <input
          v-model="namingInput"
          @keyup.enter="confirmNaming"
          type="text"
          maxlength="10"
          class="naming-input"
          placeholder="比如：狐狐"
          autofocus
        />
        <div class="naming-actions">
          <button class="naming-btn naming-btn--secondary" @click="useDefaultName">
            用默认名 {{ character?.defaultName }}
          </button>
          <button class="naming-btn naming-btn--primary" @click="confirmNaming">
            就叫这个
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  max-height: 800px;
}

/* 顶部 */
.header {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: var(--gap-sm) 0;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.back-btn,
.clear-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-card);
  color: var(--color-text);
  font-size: var(--text-body);
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: var(--shadow-card);
}

.back-btn:active,
.clear-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.clear-btn {
  font-size: var(--text-small);
}

.header-info {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  flex: 1;
  cursor: pointer;
}

.char-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--char-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-body);
  font-weight: 700;
}

.char-name {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 700;
  color: var(--color-text);
}

.char-tag {
  font-size: var(--text-tiny);
  color: var(--color-text-sub);
}

/* 对话 */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--gap-md) 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.empty {
  text-align: center;
  color: var(--color-text-sub);
  padding: var(--gap-xl);
}

.message {
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 80%;
  padding: var(--gap-sm) var(--gap-md);
  border-radius: var(--radius-lg);
  font-size: var(--text-body);
  line-height: 1.5;
  word-break: break-word;
}

.message.user .bubble {
  background: var(--color-primary);
  color: white;
  border-bottom-right-radius: var(--radius-sm);
}

.message.assistant .bubble {
  background: var(--color-card);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  border-bottom-left-radius: var(--radius-sm);
}

.bubble :deep(.en) {
  color: var(--char-color);
  font-weight: 700;
  text-decoration: underline;
  text-decoration-style: solid;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
  cursor: pointer;
}

.bubble--typing {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--gap-md);
}

.bubble--typing .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-sub);
  animation: bounce 1.2s infinite;
}

.bubble--typing .dot:nth-child(2) { animation-delay: 0.2s; }
.bubble--typing .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

.error-msg {
  text-align: center;
  padding: var(--gap-sm);
  color: var(--color-secondary);
  font-size: var(--text-small);
}

/* 输入区 */
.input-area {
  display: flex;
  gap: var(--gap-sm);
  padding: var(--gap-sm) 0;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  font-size: var(--text-body);
  font-family: inherit;
  resize: none;
  max-height: 100px;
  min-height: 40px;
}

.input:focus {
  border-color: var(--color-primary);
  outline: none;
}

.input:disabled {
  opacity: 0.6;
}

.send-btn {
  padding: 0 20px;
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  color: white;
  font-size: var(--text-body);
  font-weight: 700;
  box-shadow: var(--shadow-card);
  flex-shrink: 0;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

/* 命名弹窗 */
.naming-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 27, 61, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: var(--gap-md);
}

.naming-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--gap-xl) var(--gap-lg);
  max-width: 360px;
  width: 100%;
  text-align: center;
}

.char-avatar-big {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--char-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 700;
  margin: 0 auto var(--gap-md);
}

.naming-title {
  font-size: var(--text-h2);
  color: var(--color-text);
  margin-bottom: var(--gap-xs);
}

.naming-sub {
  font-size: var(--text-small);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-md);
}

.naming-input {
  width: 100%;
  padding: 12px 16px;
  border: 3px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 600;
  text-align: center;
  margin-bottom: var(--gap-md);
}

.naming-input:focus {
  border-color: var(--color-primary);
  outline: none;
}

.naming-actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.naming-btn {
  width: 100%;
  padding: 12px;
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  font-weight: 700;
  box-shadow: var(--shadow-card);
}

.naming-btn--primary {
  background: var(--color-primary);
  color: white;
}

.naming-btn--secondary {
  background: var(--color-bg);
  color: var(--color-text-sub);
}

.naming-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}
</style>