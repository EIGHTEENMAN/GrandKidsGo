<template>
  <p class="icp-footer">
    <a
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
      class="icp-link"
    >
      {{ config.icpMain }}
    </a>
    <span v-if="showTravel" class="icp-sep">|</span>
    <a
      v-if="showTravel"
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
      class="icp-link"
    >
      {{ config.icpTravel }}
    </a>
    <span class="icp-sep">|</span>
    <a
      :href="config.gonganUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="icp-link"
    >
      <span class="icp-shield" aria-hidden="true">🛡</span>
      {{ config.gongan }}
    </a>
  </p>
</template>

<script setup>
import config from '../config/icp.js'

defineProps({
  /**
   * 是否显示走天下备案号
   * - false（默认）：仅显示主备案号
   * - true：主备案号 + 走天下备案号（travel.grandand.com 专用）
   */
  showTravel: {
    type: Boolean,
    default: false,
  },
})
</script>

<style scoped>
.icp-footer {
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  margin: 12px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.icp-link {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s;
}

.icp-link:hover {
  color: #64748b;
  text-decoration: underline;
}

.icp-sep {
  color: #cbd5e1;
  user-select: none;
}

.icp-shield {
  display: inline-block;
  margin-right: 2px;
  font-size: 11px;
}
</style>
