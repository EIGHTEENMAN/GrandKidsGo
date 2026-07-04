import { useState, useEffect, useRef, useCallback } from 'react'

function syncChallengePoints(points: number) {
  const token = sessionStorage.getItem('haodaer_token')
  const profile = localStorage.getItem('haodaer_active_profile')
  if (!token || !profile) return
  try {
    const p = JSON.parse(profile)
    if (!p.id) return
    fetch('https://grandand.com/api/user/children/' + p.id + '/challenge-points', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ points }),
    }).catch(() => {})
  } catch {}
}

interface Props {
  user: { id: string; username: string; token: string }
  onBack: () => void
  initialMode?: 'solo' | 'online'
  initialCategory?: string
  initialRoomTarget?: string  // e.g. "ABCD-T1"
}

interface Question {
  id: number
  question: string
  options: string
  category: string
  difficulty: number
  answer: number
}

interface Player {
  userId: string
  username: string
}

interface TeamPlayer extends Player {
  score?: number
}

type Step = 'subject-select' | 'room-setup' | 'room-lobby' | 'queue' | 'playing' | 'result'

type Difficulty = { label: string; value: number }

const UI_CATEGORY_MAP: Record<string, string[]> = {
  guoxue: ['guoxue'],
  shici: ['shici'],
  tongshi: ['general', 'science'],
  english: ['english'],
  mixed: [],
}

const SUBJECTS = [
  { id: 'shici', name: '诗词', icon: '📜' },
  { id: 'guoxue', name: '国学', icon: '📖' },
  { id: 'english', name: '英语', icon: '🔤' },
  { id: 'science', name: '科学', icon: '🔬' },
  { id: 'general', name: '通识', icon: '🌍' },
]

const DIFFICULTIES: Difficulty[] = [
  { label: '全部', value: 0 },
  { label: '简单', value: 1 },
  { label: '普通', value: 2 },
  { label: '困难', value: 3 },
]

const SUBJECT_LABELS: Record<string, string> = {
  shici: '诗词', guoxue: '国学', english: '英语', science: '科学', general: '通识',
}

const TEAM_SIZES = [1, 2, 3, 4, 5]

export default function QuizBattle({ user, onBack, initialMode, initialCategory, initialRoomTarget }: Props) {
  const initialSubjects = initialCategory ? (UI_CATEGORY_MAP[initialCategory] || []) : []
  const [step, setStep] = useState<Step>(() => {
    if (initialMode === 'solo') return 'playing'
    if (initialMode === 'online' || initialRoomTarget) return 'room-setup'
    return 'room-setup'
  })
  const [gameMode, setGameMode] = useState<'solo' | 'online' | null>(initialMode || 'online')
  const [subjects, setSubjects] = useState<string[]>(initialSubjects)
  const [difficulty, setDifficulty] = useState(0)
  const [teamSize, setTeamSize] = useState(1)

  // Room state (team-based)
  const [roomCode, setRoomCode] = useState('')
  const [team1, setTeam1] = useState<Player[]>([])
  const [team2, setTeam2] = useState<Player[]>([])
  const [currentTeamSize, setCurrentTeamSize] = useState(1)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isHost, setIsHost] = useState(false)

  // WebSocket
  const [ws, setWs] = useState<WebSocket | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout>>()

  // Battle state
  const [question, setQuestion] = useState<Question | null>(null)
  const [qNumber, setQNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{
    isWinner: boolean; isDraw: boolean; message: string;
    teamScore: number; opponentScore: number;
    opponents: string[]; teamMembers: string[];
    team1: TeamPlayer[]; team2: TeamPlayer[];
  } | null>(null)
  const [timeLeft, setTimeLeft] = useState(10)

  // Solo state
  const [soloQuestions, setSoloQuestions] = useState<Question[]>([])
  const [soloIndex, setSoloIndex] = useState(0)
  const currentSoloQ = soloQuestions[soloIndex]
  const [soloDone, setSoloDone] = useState(false)
  const [soloCorrect, setSoloCorrect] = useState(0)
  const [soloLoading, setSoloLoading] = useState(() => initialMode === 'solo')

  // Auto-start solo when coming from home page
  const autoStarted = useRef(false)

  useEffect(() => {
    if (initialMode === 'solo' && !autoStarted.current) {
      autoStarted.current = true
      setSoloLoading(true)
      startSolo()
    }
  }, [])

  // Record solo score when done
  useEffect(() => {
    if (soloDone && soloQuestions.length > 0 && user.token) {
      const cat = initialCategory || 'mixed'
      const totalQ = Math.min(soloIndex + 1, soloQuestions.length)
      fetch('/api/quiz/solo/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          totalQuestions: totalQ,
          totalCorrect: soloCorrect,
          bestStreak: soloCorrect,
          category: cat,
        }),
      }).then(() => {
        // Sync challenge points to auth-service
        syncChallengePoints(soloCorrect * 10)
      }).catch(() => {})
    }
  }, [soloDone])

  // Timer for questions (both online and solo)
  useEffect(() => {
    if (timeLeft <= 0) return
    if (gameMode === 'online' && !question) return
    if (gameMode === 'solo' && (!currentSoloQ || answered)) return
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, question, currentSoloQ, gameMode, answered])

  // Reset timer when solo question changes
  useEffect(() => {
    if (gameMode === 'solo' && currentSoloQ && !soloDone && !soloLoading) {
      setTimeLeft(10)
      if (!answered) setSelected(null)
    }
  }, [soloIndex, gameMode])

  // Handle timeout for solo mode
  useEffect(() => {
    if (gameMode === 'solo' && timeLeft === 0 && !answered && currentSoloQ) {
      setAnswered(true)
      // Timeout = wrong answer, game over
      setTimeout(() => setSoloDone(true), 1500)
    }
  }, [timeLeft, gameMode])

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try { wsRef.current.send(JSON.stringify({ type: 'leave_room' })) } catch {}
        try { wsRef.current.send(JSON.stringify({ type: 'leave_queue' })) } catch {}
        wsRef.current.close()
      }
    }
  }, [])

  // Auto-join room when initialRoomTarget is provided
  useEffect(() => {
    if (initialRoomTarget && !autoStarted.current) {
      autoStarted.current = true
      // Small delay to let component mount fully
      setTimeout(() => {
        connectAndJoin(initialRoomTarget!)
      }, 100)
    }
  }, [initialRoomTarget])

  // ---- WebSocket Setup ----
  const connect = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close() } catch {}
    }
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsPort = import.meta.env.DEV ? '3001' : location.port
    const url = `${protocol}//${location.hostname}:${wsPort}/?token=${encodeURIComponent(user.token)}`
    const socket = new WebSocket(url)
    wsRef.current = socket

    socket.onopen = () => {
      setWs(socket)
    }

    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      switch (msg.type) {
        case 'connected':
          break
        case 'error':
          alert(msg.message)
          break
        case 'room_created':
          setRoomCode(msg.roomCode)
          setCurrentTeamSize(msg.teamSize)
          setTeam1(msg.team1 || [])
          setTeam2(msg.team2 || [])
          setIsHost(true)
          setStep('room-lobby')
          break
        case 'room_update':
          setTeam1(msg.team1 || [])
          setTeam2(msg.team2 || [])
          setCurrentTeamSize(msg.teamSize || currentTeamSize)
          break
        case 'match_starting':
          setCountdown(msg.countdown)
          break
        case 'match_start_cancelled':
          setCountdown(null)
          break
        case 'match_found':
          setTotalQ(msg.totalQuestions)
          setScores({})
          setResult(null)
          setCountdown(null)
          setStep('playing')
          break
        case 'match_start':
          setTotalQ(msg.totalQuestions)
          setScores({})
          setResult(null)
          setStep('playing')
          setCountdown(null)
          if (msg.team1) setTeam1(msg.team1)
          if (msg.team2) setTeam2(msg.team2)
          break
        case 'question':
          setQuestion(msg)
          setQNumber(msg.questionNumber)
          setTotalQ(msg.totalQuestions)
          setSelected(null)
          setAnswered(false)
          setTimeLeft(msg.timeLimit || 15)
          if (step !== 'playing') setStep('playing')
          break
        case 'answer_result':
          setScores(msg.scores)
          break
        case 'timeout':
          setQuestion(null)
          break
        case 'match_end':
          setResult(msg)
          setQuestion(null)
          setStep('result')
          break
        case 'opponent_left':
          socket.close()
          setWs(null)
          setStep('room-setup')
          break
        case 'queue_status':
          break
        case 'surrender_update':
          // Visual surrender notification is handled via state
          break
      }
    }

    socket.onclose = () => {
      setWs(null)
    }

    return socket
  }, [user, step, currentTeamSize])

  function connectAndJoin(code: string) {
    const socket = connect()
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join_room',
        roomCode: code,
      }))
    }
  }

  // Solo: fetch questions
  const startSolo = async () => {
    const params = new URLSearchParams()
    if (subjects.length > 0 && subjects.length < SUBJECTS.length) {
      params.set('subjects', subjects.join(','))
    }
    if (difficulty > 0) {
      params.set('difficulty', difficulty.toString())
    }
    try {
      const res = await fetch(`/api/quiz/solo?${params}`)
      const data = await res.json()
      if (data.length === 0) {
        alert('没有找到符合条件的题目，请调整选择')
        return
      }
      setSoloQuestions(data)
      setSoloIndex(0)
      setSoloDone(false)
      setSoloCorrect(0)
      setSelected(null)
      setAnswered(false)
      setSoloLoading(false)
      setStep('playing')
    } catch {
      alert('获取题目失败，请重试')
      setSoloLoading(false)
    }
  }

  const handleSoloAnswer = (idx: number) => {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    const isCorrect = idx === soloQuestions[soloIndex]?.answer
    if (isCorrect) {
      setSoloCorrect(c => c + 1)
      // Auto-advance to next question after 1.5s
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = setTimeout(() => {
        handleSoloNext()
      }, 1500)
    } else {
      // Wrong answer - game over
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = setTimeout(() => {
        setSoloDone(true)
      }, 1500)
    }
  }

  const handleSoloNext = () => {
    clearTimeout(autoAdvanceRef.current)
    if (soloIndex < soloQuestions.length - 1) {
      setSoloIndex(i => i + 1)
      setSelected(null)
      setAnswered(false)
    } else {
      setSoloDone(true)
    }
  }

  // Online: create room
  const createRoom = () => {
    const socket = connect()
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'create_room',
        subjects,
        difficulty,
        teamSize,
      }))
    }
  }

  // Online: join room by code
  const joinRoom = (code: string) => {
    connectAndJoin(code)
  }

  // Online: start match (host)
  const startMatch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_match' }))
    }
  }

  // Online: quick match
  const quickMatch = () => {
    const socket = connect()
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join_queue' }))
      setStep('queue')
    }
  }

  // Handle answer (online)
  const handleAnswer = (idx: number) => {
    if (answered || !wsRef.current) return
    setSelected(idx)
    setAnswered(true)
    wsRef.current.send(JSON.stringify({ type: 'submit_answer', answer: idx }))
  }

  // Leave room / cancel and go home
  const goHome = () => {
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'leave_room' })) } catch {}
      try { wsRef.current.send(JSON.stringify({ type: 'leave_queue' })) } catch {}
      wsRef.current.close()
    }
    setWs(null)
    onBack()
  }

  const handleLeave = () => {
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'leave_room' })) } catch {}
      wsRef.current.close()
    }
    setWs(null)
    setResult(null)
  }

  const toggleSubject = (id: string) => {
    setSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const selectAllSubjects = () => {
    setSubjects(prev => prev.length === SUBJECTS.length ? [] : SUBJECTS.map(s => s.id))
  }

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).catch(() => {})
    }
  }

  const copyInviteLink = (team: 'team1' | 'team2') => {
    if (roomCode) {
      const suffix = team === 'team1' ? '-T1' : '-T2'
      const link = `${window.location.origin}${window.location.pathname}#join?room=${roomCode}${suffix}`
      navigator.clipboard.writeText(link).catch(() => {})
    }
  }

  // Compute per-team scores for result display
  const team1Total = result ? (result.team1 || []).reduce((s, p) => s + (p.score || 0), 0) : 0
  const team2Total = result ? (result.team2 || []).reduce((s, p) => s + (p.score || 0), 0) : 0

  // ===================== RENDER =====================

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <button className="btn-secondary" onClick={goHome}>← 返回</button>
        {step === 'playing' && gameMode === 'online' && question && (
          <span style={{ fontSize: 13, color: 'var(--text-light)' }}>⏱ {timeLeft}s</span>
        )}
        {step === 'playing' && gameMode === 'solo' && !soloLoading && (
          <span style={{ fontSize: 13, color: 'var(--text-light)' }}>
            🔥 第 {soloIndex + 1}/{soloQuestions.length} 题
          </span>
        )}
      </div>

      {/* Step 1: Subject Select */}
      {step === 'subject-select' && (
        <div className="subject-select">
          <h2>{gameMode === 'solo' ? '选择练习科目' : '选择对战科目'}</h2>
          <p className="subtitle">选择你想挑战的科目（可多选）</p>

          <div className="subject-grid">
            {SUBJECTS.map(s => (
              <div
                key={s.id}
                className={`subject-card ${subjects.includes(s.id) ? 'selected' : ''}`}
                onClick={() => toggleSubject(s.id)}
              >
                <div className="subj-icon">{s.icon}</div>
                <div className="subj-name">{s.name}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: -4 }}>
            <button className="diff-btn" onClick={selectAllSubjects} style={{ fontSize: 13, padding: '4px 16px' }}>
              {subjects.length === SUBJECTS.length ? '取消全选' : '全选'}
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>难度选择</p>
            <div className="difficulty-select">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  className={`diff-btn ${difficulty === d.value ? 'selected' : ''}`}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
            {gameMode === 'solo' ? (
              <button
                className="btn-primary"
                onClick={() => { setSoloLoading(true); startSolo(); }}
              >
                🚀 开始练习
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => setStep('room-setup')}
              >
                下一步
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Room Setup (online only) */}
      {step === 'room-setup' && (
        <div className="room-setup">
          <h2>房间设置</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>选择每队人数</p>

          <div className="team-size-select">
            {TEAM_SIZES.map(n => (
              <div
                key={n}
                className={`team-size-btn ${teamSize === n ? 'selected' : ''}`}
                onClick={() => setTeamSize(n)}
              >
                <div className="size">{n}v{n}</div>
                <div className="size-label">每队{n}人</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
            <button className="btn-primary" onClick={createRoom}>
              🏠 创建房间
            </button>
            <button className="btn-secondary" onClick={quickMatch}>
              ⚡ 快速匹配
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>
              已有房间码？
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
              <input
                id="join-room-input"
                placeholder="输入房间码"
                maxLength={7}
                style={{
                  padding: '10px 14px', border: '2px solid #e7e5e4', borderRadius: 10,
                  fontSize: 18, width: 140, textAlign: 'center', letterSpacing: 4, textTransform: 'uppercase',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim().toUpperCase()
                    if (val) joinRoom(val)
                  }
                }}
              />
              <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => {
                const inp = document.getElementById('join-room-input') as HTMLInputElement
                if (inp && inp.value.trim()) joinRoom(inp.value.trim().toUpperCase())
              }}>
                加入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Room Lobby */}
      {step === 'room-lobby' && (
        <div className="room-lobby">
          <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            {countdown !== null ? `⏰ ${countdown}秒后开始...` : '等待队友加入'}
          </h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
            房间码：<strong style={{ fontSize: 20, letterSpacing: 4, color: '#2563eb', cursor: 'pointer' }} onClick={copyRoomCode}>{roomCode}</strong>
            <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', cursor: 'pointer' }} onClick={copyRoomCode}>📋 复制</span>
          </p>

          <div className="team-lobby">
            {/* Red Team */}
            <div className="team-column team-red">
              <div className="team-header">
                <span className="team-label">🔴 红队</span>
                <span className="team-count">{team1.length}/{currentTeamSize}</span>
              </div>
              {Array.from({ length: currentTeamSize }).map((_, i) => {
                const p = team1[i]
                return (
                  <div key={i} className={`team-slot ${p ? 'filled' : ''}`}>
                    <div className="slot-avatar">{p ? '🦸' : '⬜'}</div>
                    <div className="slot-info">
                      <div className="slot-name">{p ? p.username : '等待加入...'}</div>
                      <div className="slot-status">
                        {p
                          ? (p.userId === team1[0]?.userId ? '👑 队长' : '✅ 已加入')
                          : '⏳ 等待中'}
                      </div>
                    </div>
                  </div>
                )
              })}
              {isHost && (
                <button className="invite-btn invite-red" onClick={() => copyInviteLink('team1')}>
                  📕 邀请到红队
                </button>
              )}
            </div>

            {/* VS Divider */}
            <div className="vs-divider">VS</div>

            {/* Blue Team */}
            <div className="team-column team-blue">
              <div className="team-header">
                <span className="team-label">🔵 蓝队</span>
                <span className="team-count">{team2.length}/{currentTeamSize}</span>
              </div>
              {Array.from({ length: currentTeamSize }).map((_, i) => {
                const p = team2[i]
                return (
                  <div key={i} className={`team-slot ${p ? 'filled' : ''}`}>
                    <div className="slot-avatar">{p ? '🦸' : '⬜'}</div>
                    <div className="slot-info">
                      <div className="slot-name">{p ? p.username : '等待加入...'}</div>
                      <div className="slot-status">
                        {p
                          ? (p.userId === team2[0]?.userId ? '👑 队长' : '✅ 已加入')
                          : '⏳ 等待中'}
                      </div>
                    </div>
                  </div>
                )
              })}
              {isHost && (
                <button className="invite-btn invite-blue" onClick={() => copyInviteLink('team2')}>
                  📘 邀请到蓝队
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            {isHost && countdown === null && (
              <button className="btn-primary" onClick={startMatch}>
                🚀 开始对战
              </button>
            )}
            <button className="btn-secondary" onClick={goHome}>
              离开房间
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Queue */}
      {step === 'queue' && (
        <div className="quiz-card waiting animate-fadeIn">
          <div className="spinner animate-pulse" />
          <p>正在为你寻找对手...</p>
          <p style={{ fontSize: 13, color: 'var(--text-light)' }}>请稍候，正在匹配实力相近的对手</p>
          <button className="btn-secondary" onClick={goHome}>取消匹配</button>
        </div>
      )}

      {/* Step 5:Playing - Online */}
      {step === 'playing' && gameMode === 'online' && question && (
        <div className="quiz-card animate-fadeInUp" key={qNumber}>
          <div className="question-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(qNumber / totalQ) * 100}%` }} />
            </div>
            <span className="progress-text">{qNumber}/{totalQ}</span>
          </div>
          <div className="question-number">
            第 {qNumber}/{totalQ} 题 · {SUBJECT_LABELS[question.category] || question.category}
            {question.difficulty >= 2 ? ' · ⭐难度' + question.difficulty : ''}
          </div>
          <div className={`timer-badge ${timeLeft <= 3 ? 'timer-urgent' : ''}`}>
            ⏱ {timeLeft}s
          </div>
          <div className="question-text">{question.question}</div>
          <div className="options">
            {JSON.parse(typeof question.options === 'string' ? question.options : '[]').map((opt: string, i: number) => (
              <button
                key={i}
                className={`option-btn ${selected === i ? (answered ? (i === question.answer ? 'correct' : 'wrong') : 'selected') : ''}`}
                onClick={() => handleAnswer(i)}
                disabled={answered}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="score-bar" style={{ marginTop: 16 }}>
            <span>🔴 红队：{team1.reduce((s, p) => s + (scores[p.userId] || 0), 0)}分</span>
            <span>🔵 蓝队：{team2.reduce((s, p) => s + (scores[p.userId] || 0), 0)}分</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              className="btn-surrender"
              onClick={() => {
                if (window.confirm('确定要投降吗？')) {
                  wsRef.current?.send(JSON.stringify({ type: 'surrender' }))
                }
              }}
              style={{
                padding: '6px 20px', border: '1px solid #ef4444', background: 'transparent',
                color: '#ef4444', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              }}
            >
              🏳️ 投降
            </button>
          </div>
        </div>
      )}

      {/* Step 5:Playing - Solo (loading) */}
      {step === 'playing' && gameMode === 'solo' && soloLoading && (
        <div className="quiz-card waiting">
          <div className="spinner" />
          <p>加载题目中...</p>
        </div>
      )}

      {/* Step 5:Playing - Solo */}
      {step === 'playing' && gameMode === 'solo' && currentSoloQ && !soloDone && !soloLoading && (
        <div className="quiz-card animate-fadeInUp" key={soloIndex}>
          <div className="question-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((soloIndex + 1) / soloQuestions.length) * 100}%` }} />
            </div>
            <span className="progress-text">{soloIndex + 1}/{soloQuestions.length}</span>
          </div>
          <div className="question-number">
            第 {soloIndex + 1}/{soloQuestions.length} 题 · {SUBJECT_LABELS[currentSoloQ.category] || currentSoloQ.category}
          </div>
          <div className={`timer-badge ${timeLeft <= 3 ? 'timer-urgent' : ''}`}>
            ⏱ {timeLeft}s
          </div>
          <div className="question-text">{currentSoloQ.question}</div>
          <div className="options">
            {JSON.parse(typeof currentSoloQ.options === 'string' ? currentSoloQ.options : '[]').map((opt: string, i: number) => (
              <button
                key={i}
                className={`option-btn ${
                  selected === i
                    ? answered
                      ? i === currentSoloQ.answer ? 'correct' : 'wrong'
                      : 'selected'
                    : answered && i === currentSoloQ.answer
                      ? 'correct'
                      : ''
                }`}
                onClick={() => handleSoloAnswer(i)}
                disabled={answered}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="solo-streak">
            <span>🔥 已连胜 {soloCorrect} 题</span>
          </div>
        </div>
      )}

      {/* Solo Result */}
      {soloDone && (
        <div className="solo-result quiz-card animate-scaleIn">
          <div className="result-icon">🏆</div>
          <h2>{soloCorrect === soloQuestions.length ? '🎉 全部答对！' : '挑战结束！'}</h2>
          <p className="score-detail">你连续答对了 <strong>{soloCorrect}</strong> 道题</p>
          <div className="stats">
            <div className="stat-item">
              <div className="num">{soloCorrect}</div>
              <div className="lbl">连胜</div>
            </div>
            <div className="stat-item">
              <div className="num">{Math.min(soloCorrect + 1, soloQuestions.length)}</div>
              <div className="lbl">总答题</div>
            </div>
            <div className="stat-item">
              <div className="num">{soloCorrect > 0 ? Math.round(soloCorrect / Math.min(soloIndex + 1, soloQuestions.length) * 100) : 0}%</div>
              <div className="lbl">正确率</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={goHome}>返回首页</button>
            <button className="btn-secondary" onClick={() => {
              setSoloDone(false)
              setSoloQuestions([])
              setQuestion(null)
              setStep('subject-select')
            }}>重新选择</button>
          </div>
        </div>
      )}

      {/* Waiting for question (online) */}
      {step === 'playing' && gameMode === 'online' && !question && !result && (
        <div className="quiz-card waiting">
          <div className="spinner" />
          <p>等待题目...</p>
        </div>
      )}

      {/* Result (online) */}
      {step === 'result' && result && (
        <div className="quiz-card quiz-result animate-scaleIn">
          <div className="result-icon">{result.isWinner ? '🎉' : result.isDraw ? '🤝' : '💪'}</div>
          <h2>{result.message}</h2>
          <div className="result-team-scores">
            <div className="result-team result-team-red">
              <div className="rt-label">🔴 红队</div>
              <div className="rt-score">{result.team1?.reduce((s, p) => s + (p.score || 0), 0) || team1Total}</div>
              <div className="rt-members">
                {(result.team1 || []).map(p => (
                  <div key={p.userId} className="rt-member">
                    <span>{p.userId === user.id ? '⭐ ' : ''}{p.username}</span>
                    <span className="rt-member-score">+{p.score || 0}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="result-vs">VS</div>
            <div className="result-team result-team-blue">
              <div className="rt-label">🔵 蓝队</div>
              <div className="rt-score">{result.team2?.reduce((s, p) => s + (p.score || 0), 0) || team2Total}</div>
              <div className="rt-members">
                {(result.team2 || []).map(p => (
                  <div key={p.userId} className="rt-member">
                    <span>{p.userId === user.id ? '⭐ ' : ''}{p.username}</span>
                    <span className="rt-member-score">+{p.score || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn-primary" onClick={() => { handleLeave(); setStep('room-setup'); }}>再来一局</button>
            <button className="btn-secondary" onClick={onBack}>返回首页</button>
          </div>
        </div>
      )}

	    </div>
	  )
	}
