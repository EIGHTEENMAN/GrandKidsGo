/**
 * 防抖/节流工具
 */

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay = 800,
): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: any[]) => {
    if (timer) return
    fn(...args)
    timer = setTimeout(() => { timer = null }, delay)
  }) as T
}

/**
 * 包装 uni.showLoading/showModal 等需要 loading 状态的异步操作
 * @param action 异步操作
 * @param loadingText loading 文字
 * @param delay loading 最小显示时间（避免闪烁，默认 500ms）
 */
export async function withLoading(
  action: () => Promise<any>,
  loadingText = '加载中...',
  delay = 500,
): Promise<any> {
  const start = Date.now()
  uni.showLoading({ title: loadingText, mask: true })
  try {
    return await action()
  } finally {
    const elapsed = Date.now() - start
    const wait = Math.max(0, delay - elapsed)
    if (wait > 0) {
      setTimeout(() => uni.hideLoading(), wait)
    } else {
      uni.hideLoading()
    }
  }
}