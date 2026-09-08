// 答题对战 WebSocket 客户端（小答答后端）
// 协议来源：apps/xiaodada/server/index.js line 261-296
// 用途：mobile 的「挑战」tab 直接连 tiaozhan.grandand.com WebSocket，
//       接收房间状态/抢答反馈/对局结果
//
// 三端兼容：uni.connectSocket 在 H5/小程序/App 三端一致
// 重连策略：连接关闭后指数退避重连，最多 5 次
// 鉴权：ws URL ?token=<grandkidsgo_token>，由 xiaodada JWT_SECRET 验证

import { CHALLENGE_API_BASE } from './challenge-api'

// ==== 类型：客户端发送 ====
export type ClientMessage =
  | { type: 'join_queue' }
  | { type: 'leave_queue' }
  | { type: 'submit_answer'; answer: number }
  | { type: 'leave_room' }
  | { type: 'create_room'; subjects?: string[]; difficulty?: number; teamSize?: number }
  | { type: 'join_room'; roomCode: string }
  | { type: 'start_match' }
  | { type: 'surrender' }

// ==== 类型：服务端推送 ====
export interface ServerConnected {
  type: 'connected'
  userId: string
  username: string
}

export interface ServerQueueStatus {
  type: 'queue_status'
  position: number
  message: string
}

export interface ServerMatchFound {
  type: 'match_found'
  roomId: string
  opponent: string
  totalQuestions: number
}

export interface ServerRoomCreated {
  type: 'room_created'
  roomCode: string
  teamSize: number
  team1: Array<{ userId: string; username: string }>
  team2: Array<{ userId: string; username: string }>
}

export interface ServerRoomUpdate {
  type: 'room_update'
  roomCode: string
  teamSize: number
  team1: Array<{ userId: string; username: string }>
  team2: Array<{ userId: string; username: string }>
}

export interface ServerMatchStarting {
  type: 'match_starting'
  countdown: number
}

export interface ServerMatchStart {
  type: 'match_start'
  totalQuestions: number
  team1: Array<{ userId: string; username: string }>
  team2: Array<{ userId: string; username: string }>
}

export interface ServerMatchStartCancelled {
  type: 'match_start_cancelled'
}

export interface ServerQuestion {
  type: 'question'
  questionNumber: number
  totalQuestions: number
  question: string
  options: string[]
  category: string
  difficulty: number
  timeLimit: number // 秒
}

export interface ServerAnswerResult {
  type: 'answer_result'
  userId: string
  username: string
  correct: boolean
  scores: Record<string, number>
  answeredCount: number
  totalPlayers: number
}

export interface ServerTimeout {
  type: 'timeout'
}

export interface ServerSurrenderUpdate {
  type: 'surrender_update'
  userId: string
  username: string
  teamSurrenders: {
    team1: string[]
    team2: string[]
  }
}

export interface ServerMatchEnd {
  type: 'match_end'
  team1: Array<{ userId: string; username: string; score: number }>
  team2: Array<{ userId: string; username: string; score: number }>
  teamScore: number
  opponentScore: number
  teamMembers: string[]
  opponents: string[]
  isWinner: boolean
  isDraw: boolean
  message: string
}

export interface ServerError {
  type: 'error'
  message: string
}

export type ServerMessage =
  | ServerConnected
  | ServerQueueStatus
  | ServerMatchFound
  | ServerRoomCreated
  | ServerRoomUpdate
  | ServerMatchStarting
  | ServerMatchStart
  | ServerMatchStartCancelled
  | ServerQuestion
  | ServerAnswerResult
  | ServerTimeout
  | ServerSurrenderUpdate
  | ServerMatchEnd
  | ServerError

// ==== 工具：把 https:// 转 ws://（H5 端需要；小程序/App 接受 ws://） ====
function wsBase(): string {
  // uni-app H5：标准 WebSocket
  // uni-app 小程序/App：原生 WebSocket（不需要 https/ 转 ws/）
  const base = CHALLENGE_API_BASE
  if (base.startsWith('https://')) return 'wss://' + base.slice(8)
  if (base.startsWith('http://')) return 'ws://' + base.slice(7)
  return base
}

// ==== 客户端实现 ====
type Listener = (msg: ServerMessage) => void

export class ChallengeSocket {
  private socket: UniAppSocketTask | null = null
  private listeners: Set<Listener> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private intentionalClose = false
  private url = ''

  constructor() {
    this.connect()
  }

  /** 建立 WebSocket 连接 */
  connect(): void {
    const token = uni.getStorageSync('grandkidsgo_token')
    if (!token) {
      this.emit({ type: 'error', message: '请先登录' })
      return
    }
    this.url = `${wsBase()}/?token=${encodeURIComponent(token)}`
    this.intentionalClose = false

    this.socket = uni.connectSocket({
      url: this.url,
      // H5 端可设 headers，但 xiaodada 用 URL query 鉴权，不需要
      success: () => {
        this.reconnectAttempts = 0
      },
      fail: (err) => {
        console.error('[ChallengeSocket] connect fail', err)
        this.scheduleReconnect()
      },
    })

    this.socket.onOpen(() => {
      this.reconnectAttempts = 0
    })

    this.socket.onMessage((res) => {
      let msg: ServerMessage
      try {
        msg = JSON.parse(res.data as string) as ServerMessage
      } catch {
        console.warn('[ChallengeSocket] non-JSON message', res.data)
        return
      }
      this.emit(msg)
    })

    this.socket.onError((err) => {
      console.error('[ChallengeSocket] error', err)
    })

    this.socket.onClose(() => {
      if (!this.intentionalClose) {
        this.scheduleReconnect()
      }
    })
  }

  /** 发送消息 */
  send(msg: ClientMessage): void {
    if (!this.socket) {
      console.warn('[ChallengeSocket] send before connect')
      return
    }
    this.socket.send({
      data: JSON.stringify(msg),
    })
  }

  /** 监听服务端消息 */
  on(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** 主动关闭（登出时用） */
  close(): void {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socket) {
      this.socket.close({})
      this.socket = null
    }
  }

  /** 是否已连接 */
  isOpen(): boolean {
    return this.socket !== null
  }

  // ==== 内部 ====
  private emit(msg: ServerMessage): void {
    this.listeners.forEach((fn) => {
      try {
        fn(msg)
      } catch (err) {
        console.error('[ChallengeSocket] listener error', err)
      }
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit({ type: 'error', message: '连接已断开，请稍后重试' })
      return
    }
    // 指数退避：1s, 2s, 4s, 8s, 16s
    const delay = 1000 * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }
}

// ==== 单例：整个 mobile app 共享一个 WS ====
let instance: ChallengeSocket | null = null

export function getChallengeSocket(): ChallengeSocket {
  if (!instance) {
    instance = new ChallengeSocket()
  }
  return instance
}

export function destroyChallengeSocket(): void {
  if (instance) {
    instance.close()
    instance = null
  }
}