// 积分 API 工具函数

function getToken(): string | null {
  return sessionStorage.getItem('grandkidsgo_token')
}

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
    return d.data?.balance ? { earned: 0, balance: d.data.balance } : null
  } catch {
    return null
  }
}

export async function getPoints(): Promise<{ balance: number; totalEarned: number; totalSpent: number; transactions: any[] } | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch('/api/user/points', {
      headers: { 'Authorization': 'Bearer ' + token },
    })
    const d = await res.json()
    if (d.code === 'OK') return d.data
    return null
  } catch {
    return null
  }
}