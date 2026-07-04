export interface LevelDef {
  id: string
  icon: string
  label: string
  desc: string
  minItems: number
}

export const PATH_LEVELS: LevelDef[] = [
  { id: 'enlightenment', icon: '👶', label: '启蒙', desc: '开始学习之旅', minItems: 0 },
  { id: 'beginner', icon: '📚', label: '入门', desc: '掌握基础知识', minItems: 30 },
  { id: 'intermediate', icon: '🎯', label: '进阶', desc: '深入探索领域', minItems: 100 },
  { id: 'advanced', icon: '🏆', label: '深造', desc: '成为小专家', minItems: 300 },
]

export interface LevelResult {
  level: LevelDef
  unlocked: boolean
  isCurrent: boolean
  progress: number // 0-100
  currentItems: number
}

export function computeLevels(totals: { items: number }): LevelResult[] {
  let currentFound = false
  return PATH_LEVELS.map((level, i) => {
    const nextLevel = PATH_LEVELS[i + 1]
    const unlocked = totals.items >= level.minItems

    // isCurrent: this level is unlocked AND next level is locked (or this is last level)
    let isCurrent = false
    if (!currentFound) {
      if (unlocked && (!nextLevel || totals.items < nextLevel.minItems)) {
        isCurrent = true
        currentFound = true
      }
    }

    // progress toward next level threshold
    const nextMin = nextLevel ? nextLevel.minItems : level.minItems + 1
    const prevMin = level.minItems
    const range = nextMin - prevMin
    const current = Math.max(0, Math.min(range, totals.items - prevMin))
    const progress = range > 0 ? Math.round((current / range) * 100) : 100

    return { level, unlocked, isCurrent, progress, currentItems: current }
  })
}

export function getCurrentLevel(totals: { items: number }): LevelDef {
  let current = PATH_LEVELS[0]
  for (const level of PATH_LEVELS) {
    if (totals.items >= level.minItems) current = level
    else break
  }
  return current
}
