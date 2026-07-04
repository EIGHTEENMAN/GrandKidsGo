<script setup lang="ts">
defineProps<{
  apps: any[]
}>()
</script>

<template>
  <div v-if="apps.length > 0" class="shared-app-section">
    <h3 class="shared-section-title">🎯 应用搜索结果</h3>
    <div class="shared-app-grid">
      <a v-for="app in apps" :key="app.name" :href="app.href" target="_self" rel="noopener noreferrer" class="shared-app-card">
        <div class="shared-app-icon" :style="{ backgroundColor: app.color + '18' }">
          <span class="shared-app-emoji">{{ app.icon }}</span>
        </div>
        <h4 class="shared-app-name">{{ app.name }}</h4>
        <p class="shared-app-desc">{{ app.desc }}</p>
      </a>
    </div>
  </div>
</template>

<style scoped>
.shared-app-section { margin-bottom: 32px; }
.shared-section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #0f172a; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
.shared-app-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.shared-app-card {
  background: white; border-radius: 14px; padding: 24px 20px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  text-decoration: none; color: inherit; border: 1px solid #e2e8f0;
  transition: all 0.3s;
}
.shared-app-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); transform: translateY(-3px); }
.shared-app-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.shared-app-emoji { font-size: 28px; }
.shared-app-name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.shared-app-desc { font-size: 13px; color: #94a3b8; }
@media (max-width: 768px) { .shared-app-grid { grid-template-columns: 1fr; } }
</style>
