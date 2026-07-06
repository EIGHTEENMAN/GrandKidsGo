// 诗词分块 lazy load API
// 2026 首诗按 id 100/块拆为 21 个 chunk，按需 import 避免一次性下载 1.5MB
import type { Poem } from '../data/poems'
import { CHUNK_COUNT, getChunkIndexForPoemId } from '../data/poem-chunks'

// Vite 静态分析 import.meta.glob：让 build 时为每个 chunk 生成独立 chunk 文件
// 关键：eager:false（按需 import）+ query 后缀让 vite 识别为动态 chunk
const chunkModules = import.meta.glob<{ [key: string]: Poem[] }>(
  '../data/poem-chunks/chunk-*.ts',
  { eager: false }
)

// 已加载 chunk 缓存：chunkIndex → Poem[]
const chunkCache = new Map<number, Poem[]>()
// 正在加载的 Promise（去重）
const loadingPromises = new Map<number, Promise<Poem[]>>()
// 单首缓存（避免反复 chunk.find）
const poemCache = new Map<number, Poem>()

/** 内部：加载一个 chunk（去重 + 缓存） */
async function ensureChunkLoaded(idx: number): Promise<Poem[]> {
  if (idx < 0 || idx >= CHUNK_COUNT) return []
  if (chunkCache.has(idx)) return chunkCache.get(idx)!
  if (loadingPromises.has(idx)) return loadingPromises.get(idx)!

  const path = `../data/poem-chunks/chunk-${idx}.ts`
  const loader = chunkModules[path]
  if (!loader) throw new Error(`chunk module not found: ${path}`)

  const promise = loader()
    .then(mod => {
      const data = (mod as any)[`chunk${idx}`] as Poem[]
      chunkCache.set(idx, data)
      loadingPromises.delete(idx)
      return data
    })
    .catch(err => {
      loadingPromises.delete(idx)
      throw err
    })

  loadingPromises.set(idx, promise)
  return promise
}

/** 单首加载：按 id 找对应 chunk，命中缓存 */
export async function loadPoem(poemId: number): Promise<Poem | null> {
  if (poemCache.has(poemId)) return poemCache.get(poemId)!
  const chunkIdx = getChunkIndexForPoemId(poemId)
  const chunk = await ensureChunkLoaded(chunkIdx)
  const poem = chunk.find(p => p.id === poemId) ?? null
  if (poem) poemCache.set(poemId, poem)
  return poem
}

/** 按作者名 + id 列表加载所有相关 chunk，再 filter 出该作者 */
export async function loadPoemsByAuthor(author: string, ids: number[]): Promise<Poem[]> {
  if (!ids.length) return []
  // 收集需要的 chunk 索引（去重）
  const chunkIdxs = new Set(ids.map(id => getChunkIndexForPoemId(id)))
  await Promise.all([...chunkIdxs].map(ensureChunkLoaded))
  // 从已加载的 chunk 里 filter
  const results: Poem[] = []
  for (const idx of chunkIdxs) {
    const c = chunkCache.get(idx) || []
    for (const p of c) if (p.author === author) results.push(p)
  }
  return results
}

/** 全文搜索用：并发加载全部 chunk，返回所有诗 */
export async function loadAllPoems(): Promise<Poem[]> {
  const all = await Promise.all(
    Array.from({ length: CHUNK_COUNT }, (_, i) => ensureChunkLoaded(i))
  )
  return all.flat()
}

/** 调试/测试用：清空缓存 */
export function _resetPoemLoader() {
  chunkCache.clear()
  loadingPromises.clear()
  poemCache.clear()
}