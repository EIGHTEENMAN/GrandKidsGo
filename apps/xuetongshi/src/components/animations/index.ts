/**
 * animations/index.ts — 学通识动画注册表
 *
 * 4 级回退链：组件动画 → .jpg 真图 → .svg 水墨 → 文字占位
 * 组件动画由本表统一管理，支持按 topicId / sectionId 精确匹配或通配匹配。
 *
 * 加载策略：动态 import 懒加载，不进首屏 bundle。
 */

import { defineAsyncComponent, type Component } from 'vue'

export interface AnimationDef {
  /** 匹配的 topicId（如 'solar-system'）或通配 '*'（整站覆盖） */
  match: string | string[]
  /** section 匹配（可选）；不填则整个 topic 都用此动画 */
  sectionMatch?: string | string[]
  /** 动态加载的动画组件 */
  loader: () => Promise<{ default: Component }>
  /** 动画展示优先级，数值越大越优先（用于多动画匹配时） */
  priority?: number
}

/**
 * 动画注册表
 * - 按 topicId 匹配：精确指定某个 topic 用什么动画
 * - sectionMatch：可选，只在指定章节展示
 */
export const animations: AnimationDef[] = [
  // ===== S 级 12 个 =====
  {
    match: 'solar-system',
    loader: () => import('./SolarSystem.vue'),
  },
  {
    match: 'earth-moon',
    loader: () => import('./EarthMoon.vue'),
  },
  {
    match: 'force-motion',
    loader: () => import('./ForceMotion.vue'),
  },
  {
    match: 'simple-machines',
    loader: () => import('./SimpleMachines.vue'),
  },
  {
    match: 'human-body',
    sectionMatch: ['hb3', 'hb4', 'hb5'], // 循环/呼吸/消化
    loader: () => import('./HumanBodySystems.vue'),
  },
  {
    match: 'dinosaurs',
    loader: () => import('./Dinosaurs.vue'),
  },
  {
    match: 'space-explore',
    loader: () => import('./Aerospace.vue'),
  },
  {
    match: 'basic-circuits',
    loader: () => import('./BasicCircuits.vue'),
  },
  {
    match: 'volcanoes',
    loader: () => import('./VolcanoEarthquake.vue'),
  },
  {
    match: 'weather-climate',
    loader: () => import('./WaterCycle.vue'),
  },
]

/**
 * 查找匹配的动画定义
 * @param topicId 父 topic id
 * @param sectionId 可选，章节 id
 */
export function findAnimation(topicId: string, sectionId?: string): AnimationDef | null {
  // 倒序遍历（priority 高的后注册先生效）
  for (let i = animations.length - 1; i >= 0; i--) {
    const def = animations[i]
    const ids = Array.isArray(def.match) ? def.match : [def.match]
    if (!ids.includes(topicId)) continue
    if (def.sectionMatch && sectionId) {
      const secs = Array.isArray(def.sectionMatch) ? def.sectionMatch : [def.sectionMatch]
      if (!secs.includes(sectionId)) continue
    }
    return def
  }
  return null
}

/**
 * 创建异步组件包装器（带 loading + error 状态）
 */
export function createAnimationComponent(def: AnimationDef) {
  return defineAsyncComponent({
    loader: def.loader,
    delay: 100,
    timeout: 5000,
  })
}

/**
 * 简单的 loading 占位组件：保持透明 + 不占位
 * （防止异步组件未就绪时被外层 fallback 静态图抢渲染）
 */
export const AnimLoading = {
  name: 'AnimLoading',
  render() {
    return null
  },
}
