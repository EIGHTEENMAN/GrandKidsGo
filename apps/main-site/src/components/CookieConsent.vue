<script setup lang="ts">
import { ref, onMounted } from 'vue'

const accepted = ref(true)

onMounted(() => {
  accepted.value = !!localStorage.getItem('grandkidsgo_cookie_consent')
})

function accept() {
  localStorage.setItem('grandkidsgo_cookie_consent', '1')
  accepted.value = true
}
</script>

<template>
  <div v-if="!accepted" class="cc-banner">
    <div class="cc-content">
      <span class="cc-text">
        本平台使用必要的 Cookie 以保持登录状态和正常使用。我们不会追踪您的行为或投放广告。
        <a href="/legal" class="cc-link" target="_blank">了解更多</a>
      </span>
      <button class="cc-btn" @click="accept">知道了</button>
    </div>
  </div>
</template>

<style scoped>
.cc-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(8px);
  padding: 12px 16px;
  animation: ccFadeIn 0.3s ease;
}

.cc-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.cc-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
}

.cc-link {
  color: #60a5fa;
  text-decoration: none;
}

.cc-link:hover {
  text-decoration: underline;
}

.cc-btn {
  flex-shrink: 0;
  padding: 8px 20px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.cc-btn:hover {
  background: #1d4ed8;
}

@keyframes ccFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .cc-content {
    flex-direction: column;
    text-align: center;
  }
  .cc-btn {
    width: 100%;
  }
}
</style>
