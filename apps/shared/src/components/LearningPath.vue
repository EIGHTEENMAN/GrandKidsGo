<script setup lang="ts">
import { computed } from 'vue'
import { PATH_LEVELS, computeLevels } from '@shared/data/learning-path'

const props = defineProps<{
  totals: { items: number; minutes?: number }
}>()

const levels = computed(() => computeLevels(props.totals))
</script>

<template>
  <div class="lp-path">
    <div class="lp-header">
      <span>🎯 学习路径</span>
      <span class="lp-level-label">{{ levels.find(l => l.isCurrent)?.level.label || '启蒙' }}</span>
    </div>

    <div class="lp-ladder">
      <div
        v-for="(item, i) in levels"
        :key="item.level.id"
        class="lp-step"
        :class="{ 'lp-unlocked': item.unlocked, 'lp-current': item.isCurrent }"
      >
        <!-- Connector line -->
        <div v-if="i > 0" class="lp-connector" :class="{ 'lp-connector-done': item.unlocked }"></div>

        <div class="lp-step-body">
          <div class="lp-step-icon">{{ item.level.icon }}</div>
          <div class="lp-step-info">
            <div class="lp-step-top">
              <span class="lp-step-name">{{ item.level.label }}</span>
              <span v-if="item.isCurrent" class="lp-badge">当前</span>
              <span v-else-if="item.unlocked" class="lp-badge lp-badge-done">已解锁</span>
              <span v-else class="lp-badge lp-badge-locked">🔒</span>
            </div>
            <div class="lp-step-desc">{{ item.level.desc }}</div>

            <!-- Progress bar only for current level -->
            <div v-if="item.isCurrent" class="lp-bar-wrap">
              <div class="lp-bar" :style="{ width: item.progress + '%' }"></div>
            </div>
            <div v-if="item.isCurrent" class="lp-bar-label">
              {{ item.currentItems }} /
              {{ i < PATH_LEVELS.length - 1 ? PATH_LEVELS[i + 1].minItems : '∞' }} 项
            </div>

            <!-- Lock message for next locked level -->
            <div v-if="!item.unlocked && !item.isCurrent && (!levels[i-1] || levels[i-1].unlocked)" class="lp-lock-msg">
              学完 {{ item.level.minItems }} 项后解锁
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lp-path {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.lp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16px;
}
.lp-level-label {
  font-size: 13px;
  font-weight: 500;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 10px;
  border-radius: 20px;
}

.lp-ladder {
  position: relative;
}
.lp-step {
  position: relative;
}
.lp-connector {
  width: 2px;
  height: 24px;
  background: #e2e8f0;
  margin-left: 22px;
  transition: background 0.3s;
}
.lp-connector-done {
  background: #2563eb;
}
.lp-step-body {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px;
  border-radius: 10px;
  transition: all 0.2s;
}
.lp-current .lp-step-body {
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
}
.lp-step-icon {
  font-size: 24px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f8fafc;
  flex-shrink: 0;
}
.lp-current .lp-step-icon {
  background: #eff6ff;
}
.lp-step-info {
  flex: 1;
  min-width: 0;
}
.lp-step-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}
.lp-step-name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}
.lp-step-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}
.lp-badge {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #64748b;
  font-weight: 500;
}
.lp-badge-done {
  background: #dcfce7;
  color: #16a34a;
}
.lp-badge-locked {
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 12px;
}
.lp-bar-wrap {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 6px;
}
.lp-bar {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  border-radius: 3px;
  transition: width 0.5s ease;
}
.lp-bar-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 3px;
}
.lp-lock-msg {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

/* Locked levels: dimmed */
.lp-step:not(.lp-unlocked):not(.lp-current) .lp-step-name {
  color: #94a3b8;
}
.lp-step:not(.lp-unlocked):not(.lp-current) .lp-step-icon {
  opacity: 0.5;
}
</style>
