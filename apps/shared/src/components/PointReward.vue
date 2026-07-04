<script setup lang="ts">
/**
 * PointReward — 积分奖励弹窗
 * 学习完成后自动弹出，显示获得的积分和累计积分
 */
import { ref, onMounted } from 'vue'

const props = defineProps<{
  earned: number
  balance: number
  message?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const visible = ref(true)
const showBalance = ref(false)

onMounted(() => {
  // 先显示获得积分动画，1.5 秒后显示余额
  setTimeout(() => {
    showBalance.value = true
  }, 1500)
})

function close() {
  visible.value = false
  emit('close')
}

// 获取 jwt token 用于 API 请求
function getToken(): string | null {
  return sessionStorage.getItem('grandkidsgo_token')
}

// 调用后端积分 API
export async function earnPoints(type: string, description?: string): Promise<{ earned: number; balance: number } | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch('/api/user/points/earn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ type, description }),
    })
    const d = await res.json()
    if (d.code === 'OK' && d.data?.earned > 0) {
      return d.data
    }
    return null
  } catch {
    return null
  }
}
</script>

<template>
  <Teleport to="body" v-if="visible">
    <div class="pr-overlay" @click.self="close">
      <div class="pr-card">
        <div class="pr-star">⭐</div>
        <h2 class="pr-title">+{{ earned }} 积分</h2>
        <p class="pr-message">{{ message || '继续加油！' }}</p>
        <div v-if="showBalance" class="pr-balance">
          <p>当前积分 <strong>{{ balance }}</strong></p>
          <button class="pr-close-btn" @click="close">知道了</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pr-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pr-fadeIn 0.3s ease;
}

.pr-card {
  background: white;
  border-radius: 20px;
  padding: 32px 28px;
  text-align: center;
  max-width: 320px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  animation: pr-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.pr-star {
  font-size: 48px;
  margin-bottom: 8px;
  animation: pr-bounce 1s ease infinite;
}

.pr-title {
  font-size: 28px;
  font-weight: 700;
  color: #f59e0b;
  margin: 0 0 4px;
}

.pr-message {
  font-size: 15px;
  color: #6b7280;
  margin: 0 0 16px;
}

.pr-balance {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.pr-balance p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px;
}

.pr-balance strong {
  font-size: 20px;
  color: #111;
}

.pr-close-btn {
  padding: 10px 32px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.pr-close-btn:active {
  background: #1d4ed8;
}

@keyframes pr-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pr-pop {
  0% { transform: scale(0.7); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes pr-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>