// 答题对战 HTTP API 客户端（小答答后端）
// 协议来源：apps/xiaodada/server/index.js
// 三端统一：H5 / 微信小程序 / App 走同一个 base URL
//
// dev: http://127.0.0.1:3001（本地起 xiaodada）
// prod: https://tiaozhan.grandand.com（nginx 反代 xiaodada:3001，TLS + SAN 已就绪）
//
// 设计要点：
//   1. 不读 process.env（uni-app 不支持），改用 hostname 判定 dev/prod
//   2. 跨子域 cookie 自动跟随（uni.request 设 withCredentials: true）
//   3. grandkidsgo_token 显式注入 Authorization 头，避开小程序不传 cookie 的场景
//   4. HTTP 502/504 翻译为「答题服务暂不可用」友好提示

// ==== Base URL 解析 ====
function detectBase(): string {
  // H5 dev: 本地起 xiaodada:3001，访问 m.grandand.com 也走 prod 域名
  // 其它场景（小程序、App）一律 prod
  try {
    // #ifdef H5
    const host = typeof location !== 'undefined' ? location.hostname : ''
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:3001'
    }
    // #endif
  } catch {
    /* SSR / 非浏览器环境 */
  }
  return 'https://tiaozhan.grandand.com'
}

export const CHALLENGE_API_BASE = detectBase()

// ==== 类型定义 ====
export interface QuizQuestion {
  id: number
  category: string
  question: string
  /** JSON string of string[]，使用前需 parseOptions() 解析 */
  options: string
  /** 0-3，正确选项索引 */
  answer: number
  /** 1-3，难度等级 */
  difficulty: number
  section_ref?: string
}

export interface SoloQuestionParams {
  subjects?: string[]
  difficulty?: number
  limit?: number
  /** 逗号分隔，例如 "english:1,english:2" */
  section_ref?: string
}

export interface LeaderboardEntry {
  username: string
  /** elo_rating 别名（全局榜用 score，单人榜无 score 字段） */
  score?: number
  elo_rating?: number
  games_played: number
  games_won: number
  /** 单人榜字段 */
  total_questions?: number
  total_correct?: number
  best_streak?: number
  accuracy?: number
}

export interface LeaderboardResponse {
  list: LeaderboardEntry[]
  total: number
}

export interface SoloRecordBody {
  totalQuestions: number
  totalCorrect: number
  bestStreak: number
  category: string
}

export interface AuthCheckResponse {
  code: 'OK' | 'UNAUTHORIZED' | 'ERROR'
  authenticated?: boolean
  data?: {
    id: string
    username: string
    token: string
    role?: string
    nickname?: string
    avatar?: string
  }
  message?: string
}

// ==== 内部 helper ====
function authHeaders(): Record<string, string> {
  const token = uni.getStorageSync('grandkidsgo_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function jsonHeaders(): Record<string, string> {
  return { ...authHeaders(), 'Content-Type': 'application/json' }
}

interface UniRequestOptions {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  header?: Record<string, string>
  timeout?: number
}

async function request<T>(opts: UniRequestOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: opts.url,
      method: opts.method,
      data: opts.data as any,
      header: opts.header ?? {},
      timeout: opts.timeout ?? 15000,
      withCredentials: true,
      success: (res) => {
        if (res.statusCode === 502 || res.statusCode === 504) {
          reject(new Error('答题服务暂不可用'))
          return
        }
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        resolve(res.data as T)
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络异常'))
      },
    })
  })
}

// ==== 1. token 同步（mobile 启动时调一次，确认 grandkidsgo_token 有效）====
export async function checkAuth(): Promise<AuthCheckResponse> {
  return request<AuthCheckResponse>({
    url: `${CHALLENGE_API_BASE}/api/auth/check`,
    method: 'GET',
    header: authHeaders(),
  })
}

// ==== 2. 单人练习：取题 ====
export async function getSoloQuestions(params: SoloQuestionParams = {}): Promise<QuizQuestion[]> {
  const query: string[] = []
  if (params.subjects && params.subjects.length > 0) {
    query.push(`subjects=${params.subjects.join(',')}`)
  }
  if (params.difficulty && params.difficulty > 0) {
    query.push(`difficulty=${params.difficulty}`)
  }
  if (params.limit && params.limit > 0) {
    query.push(`limit=${Math.min(params.limit, 50)}`)
  }
  if (params.section_ref) {
    query.push(`section_ref=${encodeURIComponent(params.section_ref)}`)
  }
  const qs = query.length > 0 ? `?${query.join('&')}` : ''
  return request<QuizQuestion[]>({
    url: `${CHALLENGE_API_BASE}/api/quiz/solo${qs}`,
    method: 'GET',
    header: authHeaders(),
  })
}

// ==== 3. 单人练习：落分 ====
export async function recordSolo(body: SoloRecordBody): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>({
    url: `${CHALLENGE_API_BASE}/api/quiz/solo/record`,
    method: 'POST',
    header: jsonHeaders(),
    data: body,
  })
}

// ==== 4. 全局排行榜（ELO）====
export async function getLeaderboard(): Promise<LeaderboardResponse> {
  return request<LeaderboardResponse>({
    url: `${CHALLENGE_API_BASE}/api/quiz/leaderboard`,
    method: 'GET',
    header: authHeaders(),
  })
}

// ==== 5. 单人分类排行榜 ====
export async function getSoloLeaderboard(category: string = 'mixed'): Promise<LeaderboardResponse> {
  return request<LeaderboardResponse>({
    url: `${CHALLENGE_API_BASE}/api/quiz/leaderboard/solo?category=${encodeURIComponent(category)}`,
    method: 'GET',
    header: authHeaders(),
  })
}

// ==== 工具：把 QuizQuestion.options 从 JSON string 解析为 string[] ====
export function parseOptions(q: QuizQuestion): string[] {
  try {
    const parsed = JSON.parse(q.options)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}