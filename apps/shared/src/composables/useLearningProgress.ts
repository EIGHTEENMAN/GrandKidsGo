export async function reportLearningProgress(
  childId: string,
  subject: string,
  itemsLearned: number,
  timeSpentMinutes: number,
  accuracy?: number
) {
  const token = sessionStorage.getItem('grandkidsgo_token')
  if (!token) return
  try {
    await fetch('/api/user/learning-progress', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        childId,
        subject,
        itemsLearned,
        timeSpentMinutes,
        accuracy,
      }),
    })
  } catch {
    /* non-critical sync */
  }
}

export function getActiveChildId(): string | null {
  try {
    const profile = localStorage.getItem('grandkidsgo_active_profile')
    if (profile) {
      const p = JSON.parse(profile)
      return p.id || null
    }
  } catch {}
  return null
}
