import { useState, useEffect } from 'react'

interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
}

interface Props {
  user: User | null
  onLogin: (token: string, user: User) => void
  onStart: (mode: 'solo' | 'online', category: string, zone: string) => void
  onShowLogin: () => void
  roomTarget?: string | null
}

interface LeaderEntry {
  username: string
  score: number
  games_played: number
  games_won: number
}

interface SoloLeaderEntry {
  username: string
  total_questions: number
  total_correct: number
  best_streak: number
  accuracy: number
  games_played: number
}

const ZONES = ['海外', '港澳台', '华东', '华南', '华中', '华北', '西南', '西北', '东北']
const SUBJECTS = [
  { id: 'guoxue', name: '国学', icon: '📖' },
  { id: 'shici', name: '诗词', icon: '📜' },
  { id: 'tongshi', name: '通识', icon: '🌍' },
  { id: 'english', name: '英语', icon: '🔤' },
  { id: 'mixed', name: '混合', icon: '🔀' },
]
const LEADER_TABS = [
  { id: 'mixed', name: '综合榜' },
  { id: 'guoxue', name: '国学榜' },
  { id: 'shici', name: '诗词榜' },
  { id: 'tongshi', name: '通识榜' },
  { id: 'english', name: '英语榜' },
]
const LEADER_MODES = [
  { id: 'global', name: '🌐 全球对战' },
  { id: 'solo', name: '📖 单机挑战' },
]

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export default function Home({ user, onStart, onShowLogin }: Props) {
  const [zone, setZone] = useState('华东')
  const [category, setCategory] = useState('mixed')
  const [gameMode, setGameMode] = useState<'solo' | 'online'>('solo')
  const [leaderMode, setLeaderMode] = useState<'global' | 'solo'>('global')
  const [leaderTab, setLeaderTab] = useState('mixed')
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [soloLeaders, setSoloLeaders] = useState<SoloLeaderEntry[]>([])
  const [globalTotal, setGlobalTotal] = useState(0)
  const [soloTotal, setSoloTotal] = useState(0)
  const [loadingLeader, setLoadingLeader] = useState(false)

  // Fetch global leaderboard
  useEffect(() => {
    if (leaderMode !== 'global') return
    setLoadingLeader(true)
    const params = leaderTab !== 'mixed' ? `?category=${leaderTab}` : ''
    fetch(`/api/quiz/leaderboard${params}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.list || [])
        const total = Array.isArray(data) ? data.length : (data.total || 0)
        setLeaders(list); setGlobalTotal(total)
      })
      .catch(() => { setLeaders([]); setGlobalTotal(0) })
      .finally(() => setLoadingLeader(false))
  }, [leaderTab, leaderMode])

  // Fetch solo leaderboard
  useEffect(() => {
    if (leaderMode !== 'solo') return
    setLoadingLeader(true)
    const params = leaderTab !== 'mixed' ? `?category=${leaderTab}` : ''
    fetch(`/api/quiz/leaderboard/solo${params}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.list || [])
        const total = Array.isArray(data) ? data.length : (data.total || 0)
        setSoloLeaders(list); setSoloTotal(total)
      })
      .catch(() => { setSoloLeaders([]); setSoloTotal(0) })
      .finally(() => setLoadingLeader(false))
  }, [leaderMode, leaderTab])

  // Always fetch both leaderboards for hero ranking display
  useEffect(() => {
    fetch('/api/quiz/leaderboard').then(r => r.json()).then(data => {
      setLeaders(Array.isArray(data) ? data : (data.list || []))
      setGlobalTotal(Array.isArray(data) ? data.length : (data.total || 0))
    }).catch(() => {})
    fetch('/api/quiz/leaderboard/solo').then(r => r.json()).then(data => {
      setSoloLeaders(Array.isArray(data) ? data : (data.list || []))
      setSoloTotal(Array.isArray(data) ? data.length : (data.total || 0))
    }).catch(() => {})
  }, [])

  // Compute rankings
  const globalRank = user ? leaders.findIndex(l => l.username === user.username) + 1 : 0
  const soloRank = user ? soloLeaders.findIndex(l => l.username === user.username) + 1 : 0

  return (
    <div className="home-new">
      {/* Hero Banner - App Card Style */}
      {/* Hero Banner with gradient background */}
      <div className="tz-hero animate-fadeInUp">
        <div className="tz-hero-inner">
          <div className="tz-hero-top">
            <div className="tz-hero-left">
              <div className="tz-hero-icon" style={{background: '#ede9fe'}}>
                <span>⚡</span>
              </div>
              <div>
                <h1 className="tz-hero-title">来挑战</h1>
                <p className="tz-hero-desc">答题对战，益智闯关</p>
              </div>
            </div>
            {user && (
              <div className="tz-hero-ranks">
                <div className="tz-hero-rank">
                  <span className="tz-rank-label">🌐 全球对战排名</span>
                  <span className={globalRank > 0 && globalRank <= 3 ? 'tz-rank-val tz-rank-top' : 'tz-rank-val'}>
                    {globalRank > 0 ? `#${globalRank}` : '暂无'}<span className="tz-rank-div"> / </span><span className="tz-rank-total">{globalTotal}</span>
                  </span>
                </div>
                <div className="tz-hero-rank">
                  <span className="tz-rank-label">📖 单机挑战排名</span>
                  <span className={soloRank > 0 && soloRank <= 3 ? 'tz-rank-val tz-rank-top' : 'tz-rank-val'}>
                    {soloRank > 0 ? `#${soloRank}` : '暂无'}<span className="tz-rank-div"> / </span><span className="tz-rank-total">{soloTotal}</span>
                  </span>
                </div>
              </div>
            )}
            {!user && (
              <button className="tz-hero-cta" onClick={() => document.getElementById('battle-setup')?.scrollIntoView({ behavior: 'smooth' })}>开始挑战</button>
            )}
          </div>
          {/* Gameplay Instructions */}
          <div className="tz-instructions">
            <div className="tz-instr-card">
              <span className="tz-instr-icon">📚</span>
              <div>
                <div className="tz-instr-title">单人练习</div>
                <div className="tz-instr-desc">选择科目和地区，自主答题练习，逐步提升知识储备</div>
              </div>
            </div>
            <div className="tz-instr-card">
              <span className="tz-instr-icon">⚡</span>
              <div>
                <div className="tz-instr-title">在线匹配</div>
                <div className="tz-instr-desc">实时匹配全国玩家，限时答题对战，比拼知识储备</div>
              </div>
            </div>
            <div className="tz-instr-card">
              <span className="tz-instr-icon">🏆</span>
              <div>
                <div className="tz-instr-title">排行榜</div>
                <div className="tz-instr-desc">与全国玩家同台竞技，争夺各科目排行榜首位</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div id="battle-setup" className="home-columns animate-fadeInUp">
        {/* Leaderboard */}
        <div className="leaderboard-v2">
          <div className="leader-mode-toggle">
            {LEADER_MODES.map(mode => (
              <button
                key={mode.id}
                className={`leader-mode-btn ${leaderMode === mode.id ? 'active' : ''}`}
                onClick={() => setLeaderMode(mode.id as 'global' | 'solo')}
              >
                {mode.name}
              </button>
            ))}
          </div>

          <div className="leader-tabs">
            {LEADER_TABS.map(tab => (
              <button
                key={tab.id}
                className={`leader-tab ${leaderTab === tab.id ? 'active' : ''}`}
                onClick={() => setLeaderTab(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </div>

          <div className="leader-list">
            {loadingLeader ? (
              <div className="leader-loading">
                <div className="skeleton skeleton-row" style={{width: '80%', margin: '0 auto 8px'}} />
                <div className="skeleton skeleton-row" style={{width: '90%', margin: '0 auto 8px'}} />
                <div className="skeleton skeleton-row" style={{width: '70%', margin: '0 auto'}} />
              </div>
            ) : leaderMode === 'global' ? (
              leaders.length === 0 ? (
                <div className="leader-empty">暂无排行数据，快来挑战吧！</div>
              ) : (
                leaders.slice(0, 10).map((p, i) => (
                  <div key={i} className="leader-row animate-slideIn" style={{animationDelay: `${i * 0.04}s`}}>
                    <span className={`leader-rank ${i < 3 ? 'top' : ''}`}>
                      {i < 3 ? RANK_MEDALS[i] : i + 1}
                    </span>
                    <span className="leader-name">{p.username}</span>
                    <span className="leader-stat">{p.score}分</span>
                  </div>
                ))
              )
            ) : (
              soloLeaders.length === 0 ? (
                <div className="leader-empty">暂无练习记录，开启单机挑战吧！</div>
              ) : (
                soloLeaders.slice(0, 10).map((p, i) => (
                  <div key={i} className="leader-row animate-slideIn" style={{animationDelay: `${i * 0.04}s`}}>
                    <span className={`leader-rank ${i < 3 ? 'top' : ''}`}>
                      {i < 3 ? RANK_MEDALS[i] : i + 1}
                    </span>
                    <span className="leader-name">{p.username}</span>
                    <span className="leader-stat">
                      {p.best_streak}题 · {p.accuracy}%
                    </span>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Battle Setup */}
        <div className="battle-setup">
          <h2 className="battle-title">⚔️ 开始对战</h2>

          <div className="setup-section">
            <label className="setup-label">📍 战区</label>
            <div className="zone-grid">
              {ZONES.map(z => (
                <button
                  key={z}
                  className={`zone-btn ${zone === z ? 'active' : ''}`}
                  onClick={() => setZone(z)}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <label className="setup-label">📚 科目</label>
            <div className="subject-row">
              {SUBJECTS.map(s => (
                <button
                  key={s.id}
                  className={`subj-pill ${category === s.id ? 'active' : ''}`}
                  onClick={() => setCategory(s.id)}
                >
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <label className="setup-label">🎮 模式</label>
            <div className="mode-row">
              <button
                className={`mode-btn ${gameMode === 'solo' ? 'active' : ''}`}
                onClick={() => setGameMode('solo')}
              >
                <span className="mode-icon">📚</span>
                <span className="mode-name">单人练习</span>
              </button>
              <button
                className={`mode-btn ${gameMode === 'online' ? 'active' : ''}`}
                onClick={() => setGameMode('online')}
              >
                <span className="mode-icon">⚡</span>
                <span className="mode-name">在线匹配</span>
              </button>
            </div>
          </div>

          <button
            className="btn-start"
            onClick={() => {
              if (!user) {
                onShowLogin()
                return
              }
              onStart(gameMode, category, zone)
            }}
          >
            {gameMode === 'solo' ? '🚀 开始答题' : '⚡ 开始匹配'}
          </button>
        </div>
      </div>
    </div>
  )
}
