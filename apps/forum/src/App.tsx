import { useState, useEffect, useCallback } from 'react'
import { navLinks } from '@shared/config/navLinks'
import LoginModal from './components/LoginModal'

type Page = 'home' | 'post' | 'new' | 'search'
interface User { id: string; username: string; token: string }
interface Board { id: string; name: string; description: string; post_count: number }

function getStoredUser(): { id: string; username: string; nickname?: string; avatar?: string } | null {
  try {
    const raw = sessionStorage.getItem('haodaer_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getToken(): string | null {
  return sessionStorage.getItem('haodaer_token')
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function getDisplayName(): string {
  const stored = getStoredUser()
  if (!stored) return ''
  try {
    const profile = localStorage.getItem('haodaer_active_profile')
    if (profile) {
      const p = JSON.parse(profile)
      return p.nickname || stored.nickname || stored.username
    }
  } catch {}
  return stored.nickname || stored.username || '用户'
}

function api(url: string, options?: RequestInit) {
  return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers as any } })
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('home')
  const [boards, setBoards] = useState<Board[]>([])
  const [boardId, setBoardId] = useState('')
  const [posts, setPosts] = useState<any[]>([])
  const [sort, setSort] = useState('hot')
  const [postId, setPostId] = useState<string | null>(null)
  const [postDetail, setPostDetail] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [notifs, setNotifs] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showNewPost, setShowNewPost] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: string; id: string } | null>(null)
  const [reportReason, setReportReason] = useState('')

  useEffect(() => {
    api('/api/boards').then(r => r.json()).then(setBoards).catch(() => {})
    history.replaceState({ page: 'home' }, '')

    async function autoLogin() {
      let stored = getStoredUser()
      let token = getToken()

      // Cross-app auth sync: check cookie if no localStorage
      if (!token) {
        const cookieToken = getCookie('haodaer_token')
        if (cookieToken) {
          sessionStorage.setItem('haodaer_token', cookieToken)
          token = cookieToken
          try {
            const r = await fetch('/api/auth/me', {
              headers: { 'Authorization': 'Bearer ' + cookieToken }
            })
            const d = await r.json()
            if (d.code === 'OK') {
              sessionStorage.setItem('haodaer_user', JSON.stringify(d.data))
              stored = d.data
            }
          } catch {}
        }
      }

      if (stored && token) {
        const username = getDisplayName()
        try {
          const r = await api('/api/auth', {
            method: 'POST',
            body: JSON.stringify({ userId: stored.id, username })
          })
          const d = await r.json()
          setUser({ id: stored.id, username, token: d.token })
        } catch {}
      }
    }

    // Listen for report events from PostDetail
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setReportTarget(detail)
      setReportReason('')
    }
    window.addEventListener('open-report', handler)
    return () => window.removeEventListener('open-report', handler)
  }, [])

  // Browser navigation: popstate listener
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) {
        const p = event.state.page as Page
        setPage(p)
        if (p === 'home') { setPostId(null); fetchPosts() }
      } else {
        setPage('home')
        setPostId(null)
        fetchPosts()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Separate fetchPosts so it can be called from popstate handler (needs latest state)
  const fetchPosts = useCallback(async () => {
    const params = new URLSearchParams({ sort, page: '1', limit: '20' })
    if (boardId) params.set('boardId', boardId)
    const headers: any = {}
    if (user) headers['Authorization'] = `Bearer ${user.token}`
    const r = await api(`/api/posts?${params}`, { headers })
    const d = await r.json()
    setPosts(d.posts || [])
  }, [boardId, sort, user])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const fetchNotifs = useCallback(async () => {
    if (!user) return
    const r = await api('/api/notifications', { headers: { 'Authorization': `Bearer ${user.token}` } })
    const d = await r.json()
    setNotifs(d.list || [])
    setUnread(d.unread || 0)
  }, [user])

  const navigate = (p: Page, extra?: Record<string, any>) => {
    history.pushState({ page: p, ...extra }, '')
    setPage(p)
  }

  const goBack = () => {
    history.back()
  }

  const openPost = async (id: string) => {
    setPostId(id)
    navigate('post')
    const headers: any = {}
    if (user) headers['Authorization'] = `Bearer ${user.token}`
    const [pr, cr] = await Promise.all([
      api(`/api/posts/${id}`, { headers }).then(r => r.json()),
      api(`/api/posts/${id}/comments`).then(r => r.json()),
    ])
    setPostDetail(pr)
    setComments(cr)
  }

  const handleLike = async (targetType: string, targetId: string) => {
    if (!user) return
    const r = await api('/api/like', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ targetType, targetId }),
    })
    const d = await r.json()
    if (targetType === 'post' && postDetail) {
      setPostDetail({ ...postDetail, isLiked: d.liked, like_count: postDetail.like_count + (d.liked ? 1 : -1) })
    }
  }

  const createPost = async (title: string, content: string) => {
    if (!user) return
    await api('/api/posts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ boardId, title, content }),
    })
    setShowNewPost(false)
    fetchPosts()
  }

  const submitComment = async (content: string, parentId?: string) => {
    if (!user || !postId) return
    await api(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ content, parentId }),
    })
    const r = await api(`/api/posts/${postId}/comments`).then(r => r.json())
    setComments(r)
    fetchNotifs()
  }

  const doReport = async () => {
    if (!user || !reportTarget || !reportReason.trim()) return
    await api('/api/reports', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ targetType: reportTarget.type, targetId: reportTarget.id, reason: reportReason }),
    })
    setReportTarget(null)
    setReportReason('')
  }

  const handleLogin = useCallback(async (token: string, userData: any) => {
    const username = getDisplayName()
    try {
      const r = await api('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ userId: userData.id, username }),
      })
      const d = await r.json()
      setUser({ id: userData.id, username, token: d.token })
      fetchPosts()
      fetchNotifs()
    } catch {}
  }, [])

  const doSearch = async () => {
    if (!searchQ.trim()) return
    const r = await api(`/api/search?q=${encodeURIComponent(searchQ)}`).then(r => r.json())
    setSearchResults(r.posts || [])
    navigate('search')
  }

  return (
    <>
      <header className="forum-header">
        <div className="forum-header-inner">
          <div className="forum-header-left">
            <a href="https://grandand.com" className="forum-logo">童慧行</a>
            <form className="forum-search" onSubmit={(e) => { e.preventDefault(); const inp = document.querySelector(".forum-search-input") as HTMLInputElement; if(inp?.value) window.location.href = "https://grandand.com/search?q=" + encodeURIComponent(inp.value); }}>
              <svg className="forum-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" onClick={() => { const inp = document.querySelector(".forum-search-input") as HTMLInputElement; if(inp?.value) window.location.href = "https://grandand.com/search?q=" + encodeURIComponent(inp.value); }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input placeholder="搜索" className="forum-search-input" />
            </form>
          </div>
          <div className="forum-header-right">
            <div className="forum-header-links">
              {navLinks.filter(l => !l.hidden).map(link => (
                <a key={link.label} href={link.href} className="forum-header-link">{link.icon} {link.label}</a>
              ))}
            </div>
            <div className="forum-header-auth">
              {user && (
                <>
                  <button className="btn btn-ghost" onClick={() => { setShowNotif(!showNotif); if (!showNotif) fetchNotifs() }}>
                    🔔{unread > 0 && <span className="notif-dot" />}
                  </button>
                  <span className="username">{user.username}</span>
                </>
              )}
              {!user && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowLogin(true)}>登录 / 注册</button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="app">

      {/* Notifications */}
      {showNotif && user && (
        <div className="post-card" style={{ position: 'absolute', right: 16, width: 320, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>通知</strong>
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              await api('/api/notifications/read', { method: 'POST', headers: { 'Authorization': `Bearer ${user.token}` } })
              setUnread(0)
            }}>全部已读</button>
          </div>
          {notifs.length === 0 && <p style={{ color: 'var(--text-light)', fontSize: 13 }}>暂无通知</p>}
          {notifs.map(n => (
            <div key={n.id} className="notif-item" onClick={() => { setShowNotif(false); openPost(n.related_id) }}>
              {n.content}
            </div>
          ))}
        </div>
      )}

      {page === 'home' && (
        <>
          {/* Search */}
          <div className="search-bar">
            <input className="input" placeholder="搜索帖子..." value={searchQ}
              onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} />
            <button className="btn btn-primary btn-sm" onClick={doSearch}>搜索</button>
          </div>

          {/* Boards */}
          <div className="boards">
            <button className={`board-chip ${!boardId ? 'active' : ''}`} onClick={() => setBoardId('')}>全部</button>
            {boards.map(b => (
              <button key={b.id} className={`board-chip ${boardId === b.id ? 'active' : ''}`}
                onClick={() => setBoardId(b.id)}>{b.name}</button>
            ))}
          </div>

          {/* Sort + New Post */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="sort-tabs">
              {['hot', 'latest'].map(s => (
                <button key={s} className={`sort-tab ${sort === s ? 'active' : ''}`} onClick={() => setSort(s)}>
                  {s === 'hot' ? '🔥 热门' : '🕐 最新'}
                </button>
              ))}
            </div>
            {user && <button className="btn btn-primary btn-sm" onClick={() => setShowNewPost(true)}>+ 发帖</button>}
          </div>

          {/* Post list */}
          {posts.map(p => (
            <div key={p.id} className="post-card" onClick={() => openPost(p.id)}>
              <div className="post-title">{p.title}</div>
              {p.excerpt && <div className="post-excerpt">{p.excerpt}</div>}
              <div className="post-meta">
                <span className="post-board">{p.board_name}</span>
                <span>{p.username}</span>
                <span>👁 {p.view_count}</span>
                <span>❤ {p.like_count}</span>
                <span>💬 {p.comment_count}</span>
                <span>{p.created_at?.slice(0, 10)}</span>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: 'var(--text-light)' }}>暂无帖子</p>}

          {/* New Post Modal */}
          {showNewPost && <NewPostModal boards={boards} boardId={boardId}
            onClose={() => setShowNewPost(false)} onSubmit={createPost} />}
        </>
      )}

      {page === 'post' && postDetail && (
        <PostDetail
          post={postDetail} comments={comments} user={user}
          onBack={goBack}
          onLike={() => handleLike('post', postDetail.id)}
          onComment={(content, parentId) => submitComment(content, parentId)}
        />
      )}

      {page === 'search' && (
        <div>
          <button className="btn btn-outline btn-sm" onClick={goBack} style={{ marginBottom: 12 }}>← 返回</button>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 12 }}>搜索结果：{searchResults.length} 条</p>
          {searchResults.map(p => (
            <div key={p.id} className="post-card" onClick={() => openPost(p.id)}>
              <div className="post-title">{p.title}</div>
              <div className="post-excerpt">{p.excerpt}</div>
              <div className="post-meta">
                <span className="post-board">{p.board_name}</span>
                <span>{p.username}</span>
                <span>{p.created_at?.slice(0, 10)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLogin} />

      {/* Report Modal */}
      {reportTarget && (
        <div className="modal-overlay" onClick={() => setReportTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>举报 {reportTarget.type === 'post' ? '帖子' : '评论'}</h3>
            <textarea className="textarea" style={{ marginBottom: 12 }}
              placeholder="请描述举报原因..." value={reportReason}
              onChange={e => setReportReason(e.target.value)} />
            <div className="actions">
              <button className="btn btn-outline" onClick={() => setReportTarget(null)}>取消</button>
              <button className="btn btn-primary" disabled={!reportReason.trim()} onClick={doReport}>提交举报</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function NewPostModal({ boards, boardId, onClose, onSubmit }: {
  boards: Board[]; boardId: string; onClose: () => void; onSubmit: (title: string, content: string) => void
}) {
  const [board, setBoard] = useState(boardId || boards[0]?.id || '')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>发布帖子</h3>
        <select className="input" style={{ marginBottom: 12 }} value={board} onChange={e => setBoard(e.target.value)}>
          {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input className="input" style={{ marginBottom: 12 }} placeholder="标题" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="textarea" style={{ marginBottom: 12 }} placeholder="内容..." value={content} onChange={e => setContent(e.target.value)} />
        <div className="actions">
          <button className="btn btn-outline" onClick={onClose}>取消</button>
          <button className="btn btn-primary" disabled={!title.trim() || !content.trim()} onClick={() => onSubmit(title, content)}>发布</button>
        </div>
      </div>
    </div>
  )
}

function PostDetail({ post, comments, user, onBack, onLike, onComment }: {
  post: any; comments: any[]; user: User | null; onBack: () => void; onLike: () => void; onComment: (content: string, parentId?: string) => void
}) {
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  return (
    <div>
      <button className="btn btn-outline btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>← 返回列表</button>
      <div className="detail">
        <h2>{post.title}</h2>
        <div className="meta">
          <span>{post.board_name}</span>
          <span>{post.username}</span>
          <span>{post.created_at?.slice(0, 10)}</span>
          <span>👁 {post.view_count}</span>
        </div>
        <div className="content">{post.content}</div>
        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className={`btn btn-sm ${post.isLiked ? 'btn-danger' : 'btn-outline'}`} onClick={onLike}>
            ❤ {post.like_count || 0}
          </button>
          {user && <button className="btn btn-ghost btn-sm" onClick={() => { const p = post; window.dispatchEvent(new CustomEvent('open-report', { detail: { type: 'post', id: p.id } })) }}>举报</button>}
        </div>
      </div>

      <h4 style={{ marginBottom: 12, fontSize: 15 }}>💬 评论 ({comments.length})</h4>
      {user && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <input className="input" placeholder="写评论..." value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && replyText.trim()) { onComment(replyText); setReplyText('') } }} />
          <button className="btn btn-primary btn-sm" onClick={() => { if (replyText.trim()) { onComment(replyText); setReplyText('') } }}>发送</button>
        </div>
      )}
      {!user && <p className="login-prompt" style={{ fontSize: 13 }}>登录后才能评论</p>}

      {comments.map(c => (
        <div key={c.id}>
          <div className="comment">
            <div className="comment-meta">
              {c.username} · {c.created_at?.slice(0, 10)}
              {user && <button className="btn btn-ghost btn-sm" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>回复</button>}
              {user && <button className="btn btn-ghost btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('open-report', { detail: { type: 'comment', id: c.id } }))}>举报</button>}
            </div>
            <div className="comment-content">{c.content}</div>
            {replyTo === c.id && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input className="input" placeholder="回复..." autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { onComment((e.target as HTMLInputElement).value, c.id); (e.target as HTMLInputElement).value = ''; setReplyTo(null) } }} />
              </div>
            )}
            {c.replies?.map((r: any) => (
              <div key={r.id} className="comment-reply">
                <div className="comment">
                  <div className="comment-meta">{r.username} · {r.created_at?.slice(0, 10)}</div>
                  <div className="comment-content">{r.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
