/**
 * 通用同步工具：把学习数据同步到主站后端
 * v3: 参数化 subject，支持 game-data / challenge-points / study-data
 */

const AUTH_BASE = 'https://grandand.com'

async function syncToChild(subject: string, payload: Record<string, any>) {
  const token = sessionStorage.getItem('grandkidsgo_token')
  const profile = localStorage.getItem('grandkidsgo_active_profile')
  if (!token || !profile) return
  try {
    const p = JSON.parse(profile)
    if (!p.id) return
    await fetch(`${AUTH_BASE}/api/user/children/${p.id}/${subject}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(payload)
    })
  } catch {
    /* non-critical sync, ignore */
  }
}

// 兼容旧 API
export async function syncGameData(level: number, score: number) {
  return syncToChild('game-data', { gameLevel: level, gameScore: score })
}

export async function syncChallengePoints(points: number) {
  return syncToChild('challenge-points', { points })
}

// 新增 v3 学习数据同步
export async function syncStudyData(masteredCount: number, accuracy: number, sessionsCompleted: number) {
  return syncToChild('study-data', {
    masteredCount,
    accuracy,
    sessionsCompleted
  })
}