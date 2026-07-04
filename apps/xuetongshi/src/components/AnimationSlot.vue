<script setup lang="ts">
/**
 * AnimationSlot — 学通识配图统一入口（v4）
 *
 * 行为：
 *   - 默认显示静态图（jpg → svg → 文字）+ 右下角"🔍 点击全屏"提示
 *   - 点击图片全屏查看：动画模式显示放大的动画，否则显示静态大图
 *   - 不再有"启动动画/暂停"按钮
 *
 * 设计：
 *   - 静态图为入口（0 延迟看到内容）
 *   - 全屏是奖励（动画在这里展现）
 *   - 动画组件按需在 ANIM_MAP 注册，新加动画无需改这里
 */
import { ref, computed, type Component } from 'vue'
import { findAnimation } from './animations'
import SolarSystem from './animations/SolarSystem.vue'
import EarthMoon from './animations/EarthMoon.vue'
import ForceMotion from './animations/ForceMotion.vue'
import SimpleMachines from './animations/SimpleMachines.vue'
import HumanBodySystems from './animations/HumanBodySystems.vue'
import Dinosaurs from './animations/Dinosaurs.vue'
import Aerospace from './animations/Aerospace.vue'
import BasicCircuits from './animations/BasicCircuits.vue'
import VolcanoEarthquake from './animations/VolcanoEarthquake.vue'
import WaterCycle from './animations/WaterCycle.vue'
import MatterElements from './animations/MatterElements.vue'
import AtomsMolecules from './animations/AtomsMolecules.vue'
import LightSound from './animations/LightSound.vue'
import Evolution from './animations/Evolution.vue'
import FoodChains from './animations/FoodChains.vue'
import PlantWorld from './animations/PlantWorld.vue'
import EnergyPower from './animations/EnergyPower.vue'
import Oceans from './animations/Oceans.vue'
import Robots from './animations/Robots.vue'
import TempHeat from './animations/TempHeat.vue'
import TimeSpace from './animations/TimeSpace.vue'
import Camouflage from './animations/Camouflage.vue'
import Computers from './animations/Computers.vue'
import Communication from './animations/Communication.vue'
import Inventions from './animations/Inventions.vue'
import Transport from './animations/Transport.vue'
import PlantsBasic from './animations/PlantsBasic.vue'
import HistoryFigures from './animations/HistoryFigures.vue'
import Geography from './animations/Geography.vue'
import Arts from './animations/Arts.vue'
import Folklore from './animations/Folklore.vue'
import Architecture from './animations/Architecture.vue'

const ANIM_MAP: Record<string, Component> = {
  'solar-system': SolarSystem,
  'earth-moon': EarthMoon,
  'force-motion': ForceMotion,
  'simple-machines': SimpleMachines,
  'human-body': HumanBodySystems,
  'dinosaurs': Dinosaurs,
  'space-explore': Aerospace,
  'basic-circuits': BasicCircuits,
  'volcanoes': VolcanoEarthquake,
  'weather-climate': WaterCycle,
  'matter-elements': MatterElements,
  'atoms-molecules': AtomsMolecules,
  'light-sound': LightSound,
  'evolution': Evolution,
  'food-chains': FoodChains,
  'plant-world': PlantWorld,
  'energy-power': EnergyPower,
  'oceans': Oceans,
  'robots': Robots,
  'temp-heat': TempHeat,
  'time-space': TimeSpace,
  'camouflage': Camouflage,
  'computers': Computers,
  'communication': Communication,
  'inventions': Inventions,
  'transport': Transport,
  'plants-basic': PlantsBasic,
  'xuanzang': HistoryFigures,  // 玄奘西行
  'li-bai': HistoryFigures,   // 李白
  'zhuge-liang': HistoryFigures, // 诸葛亮
  'sima-qian': HistoryFigures, // 司马迁
  'zu-chongzhi': HistoryFigures, // 祖冲之
  'china-geo': Geography,
  'world-geo': Geography,
  'rivers-lakes': Geography,
  'mountains': Geography,
  'deserts': Geography,
  'polar': Geography,
  // 艺术
  'calligraphy': Arts,
  'chinese-painting': Arts,
  'music-world': Arts,
  'dance-drama': Arts,
  'sculpture-art': Arts,
  'chinese-opera': Arts,
  // 民俗
  'dragon-dance': Folklore,
  'chinese-food': Folklore,
  'chinese-tea': Folklore,
  'chess': Folklore,
  // 建筑
  'architecture-art': Architecture,
  'ceramic-art': Architecture,
}

const props = defineProps<{
  topicId: string
  topicTitle: string
  category: string
  color?: string
  parentTopicId?: string
}>()

type FallbackStage = 'jpg' | 'none'
const fallbackStage = ref<FallbackStage>('jpg')
const imgStatus = ref<'loading' | 'loaded' | 'error'>('loading')
const showFullscreen = ref(false)

/** 是否有动画（决定全屏渲染动画还是静态图） */
const sectionId = computed(() => (props.parentTopicId ? props.topicId : undefined))
const lookupTopicId = computed(() => props.parentTopicId || props.topicId)
const hasAnimation = computed(() => !!findAnimation(lookupTopicId.value, sectionId.value))

/** 全屏时用哪个动画组件 */
const FullscreenAnim = computed<Component | null>(() => {
  const def = findAnimation(lookupTopicId.value, sectionId.value)
  if (!def) return null
  const ids = Array.isArray(def.match) ? def.match : [def.match]
  for (const id of ids) {
    if (ANIM_MAP[id]) return ANIM_MAP[id]
  }
  return null
})

/** 静态图 URL */
const mediaUrl = computed(() => {
  const base = props.parentTopicId
    ? `/images/sections/${props.parentTopicId}-${props.topicId}`
    : `/images/knowledge/${props.topicId}`
  if (fallbackStage.value === 'none') return null
  return `${base}.${fallbackStage.value}`
})

function handleImgLoad() {
  imgStatus.value = 'loaded'
}

function handleImgError() {
  // jpg 失败直接跳到文字占位，不再走 SVG fallback
  // （SVG 是 v1 水彩风格，已不符合现代百科调性）
  fallbackStage.value = 'none'
}
</script>

<template>
  <div
    class="as-banner"
    :class="{ 'as-banner-clickable': imgStatus === 'loaded' || mediaUrl === null }"
    :style="{ backgroundColor: (color || '#94a3b8') + '15' }"
    @click="(imgStatus === 'loaded' || mediaUrl === null) && (showFullscreen = true)"
  >
    <!-- 静态图入口 -->
    <template v-if="mediaUrl">
      <img
        :src="mediaUrl"
        :alt="topicTitle"
        class="as-img"
        :class="{ 'as-img-loaded': imgStatus === 'loaded' }"
        @load="handleImgLoad"
        @error="handleImgError"
      />
    </template>

    <!-- 文字占位 -->
    <div v-else class="as-fallback">
      <div class="as-fallback-char">{{ topicTitle.slice(0, 1) }}</div>
      <div class="as-fallback-title">{{ topicTitle }}</div>
    </div>

    <!-- 类别徽章 -->
    <div class="as-badge" :style="{ backgroundColor: color || '#94a3b8' }">
      {{ category }}
    </div>

    <!-- "点击全屏"提示：有动画时显示"看动效"，否则显示"点击全屏" -->
    <div v-if="imgStatus === 'loaded' || mediaUrl === null" class="as-hint">
      <span class="as-hint-icon">{{ hasAnimation ? '🎬' : '🔍' }}</span>
      <span>{{ hasAnimation ? '点击看动效' : '点击全屏' }}</span>
    </div>

    <!-- 全屏查看 -->
    <Teleport to="body" v-if="showFullscreen">
      <div class="as-fullscreen" @click="showFullscreen = false">
        <!-- 有动画：渲染独立动画实例 -->
        <div v-if="FullscreenAnim" class="as-fullscreen-anim" @click.stop>
          <component
            :is="FullscreenAnim"
            :topic-id="topicId"
            :parent-topic-id="parentTopicId"
          />
          <div class="as-fullscreen-hint">点击任意位置关闭</div>
        </div>
        <!-- 无动画：放大大图 -->
        <template v-else>
          <img
            v-if="mediaUrl"
            :src="mediaUrl"
            :alt="topicTitle"
            class="as-fullscreen-img"
            @click.stop
          />
          <div v-else class="as-fullscreen-fallback">
            <div class="as-fullscreen-char">{{ topicTitle.slice(0, 1) }}</div>
            <div class="as-fullscreen-title">{{ topicTitle }}</div>
          </div>
        </template>
        <button class="as-close" @click.stop="showFullscreen = false">×</button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.as-banner {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-in;
}

.as-img {
  width: 100%;
  height: 100%;
  object-fit: contain;  /* contain 而非 cover：保留完整图（百科风格），不裁剪 */
  opacity: 0;
  transition: opacity 0.4s ease;
}
.as-img-loaded {
  opacity: 1;
}

.as-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
  backdrop-filter: blur(4px);
  z-index: 2;
  pointer-events: none;
}

.as-hint {
  position: absolute;
  bottom: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(15, 23, 42, 0.7);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 14px;
  backdrop-filter: blur(8px);
  z-index: 2;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: as-hint-pulse 2.5s ease-in-out infinite;
}
.as-hint-icon {
  font-size: 12px;
}
@keyframes as-hint-pulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.06); opacity: 1; }
}

.as-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #94a3b8;
}
.as-fallback-char {
  font-size: 120px;
  font-weight: 900;
  font-family: serif;
  opacity: 0.4;
  line-height: 1;
}
.as-fallback-title {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
}

/* 全屏查看 */
.as-fullscreen {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
  cursor: zoom-out;
}

/* 动画全屏：占满 + 动画继续运行 */
.as-fullscreen-anim {
  width: 100%;
  height: 100%;
  max-width: 1280px;
  max-height: 720px;
  border-radius: 16px;
  overflow: hidden;
  cursor: default;
  position: relative;
}
.as-fullscreen-hint {
  position: absolute;
  bottom: 12px;
  right: 16px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 10px;
  border-radius: 8px;
  pointer-events: none;
  backdrop-filter: blur(4px);
}

.as-fullscreen-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: default;
}
.as-fullscreen-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
}
.as-fullscreen-char {
  font-size: 240px;
  font-weight: 900;
  font-family: serif;
  opacity: 0.5;
  line-height: 1;
}
.as-fullscreen-title {
  margin-top: 16px;
  font-size: 24px;
  font-weight: 700;
  color: #cbd5e1;
}

.as-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 28px;
  border-radius: 50%;
  cursor: pointer;
  backdrop-filter: blur(4px);
  z-index: 10000;
}
.as-close:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
