export function filterApps(query: string) {
  if (!query.trim()) return []
  const q = query.toLowerCase().trim()

  const apps = [
    { name: '学国学', desc: '经典启蒙，明智修身', icon: '📚', href: 'https://xueguoxue.grandand.com', color: '#8b5cf6' },
    { name: '学诗词', desc: '唐诗宋词，古韵童声', icon: '📜', href: 'https://xueshici.grandand.com', color: '#f59e0b' },
    { name: '学通识', desc: '天文地理，万物百科', icon: '🔭', href: 'https://xuetongshi.grandand.com', color: '#06b6d4' },
    { name: '学英语', desc: '趣味单词，自然拼读', icon: '🔤', href: 'https://english.grandand.com', color: '#ec4899' },
    { name: '来挑战', desc: '答题对战，益智闯关', icon: '⚡', href: 'https://tiaozhan.grandand.com', color: '#ef4444' },
    { name: '走天下', desc: '亲子旅行攻略分享', icon: '✈️', href: 'https://travel.grandand.com', color: '#3b82f6' },
  ]

  return apps.filter(a =>
    a.name.includes(q) || a.desc.includes(q)
  ).map(a => ({ type: 'app', ...a }))
}
