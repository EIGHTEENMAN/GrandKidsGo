export interface NavLink {
  label: string
  href: string
  icon: string
  hidden: boolean
  /** Tracking key used by main-site App.vue trackApp(). Only needed for entries that have app-card tracking. */
  trackKey?: string
}

export const navLinks: NavLink[] = [
  { label: '论坛', href: 'https://forum.grandand.com', icon: '💬', hidden: true, trackKey: 'forum' },
  { label: '商城', href: 'https://store.grandand.com', icon: '🎁', hidden: true, trackKey: 'store' },
  { label: '帮助', href: '/faq', icon: '❓', hidden: false },
]
