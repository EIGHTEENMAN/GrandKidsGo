import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import cors from 'cors';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Use auth-service JWT secret for shared auth
const JWT_SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || 'grandkidsgo-auth-jwt-secret-kids-2024';
const LOCAL_JWT_SECRET = process.env.JWT_SECRET || 'grandkidsgo-tiaozhan-dev-secret';

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(cors());

// Auth middleware — verify auth-service JWT
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = { id: payload.sub, username: payload.sub, role: payload.role };
    next();
  } catch {
    // Fallback: try local JWT secret
    try {
      req.user = jwt.verify(header.slice(7), LOCAL_JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: '登录已过期' });
    }
  }
}

// Verify auth-service token and sync local user
app.post('/api/auth', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: '缺少token' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    try {
      payload = jwt.verify(token, LOCAL_JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'token无效' });
    }
  }

  const userId = payload.sub;
  const username = payload.username || userId;

  // Sync local user
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) {
    db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(userId, username);
  } else if (existing.username !== username) {
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId);
  }

  // Return a local token for WebSocket auth
  const localToken = jwt.sign({ id: userId, username }, LOCAL_JWT_SECRET, { expiresIn: '7d' });
  res.json({ token: localToken, userId, username });
});

// Leaderboard (global/online)
app.get('/api/quiz/leaderboard', (_req, res) => {
  const list = db.prepare(
    'SELECT username, elo_rating AS score, games_played, games_won FROM users ORDER BY elo_rating DESC LIMIT 20'
  ).all();
  const total = db.prepare("SELECT COUNT(*) as c FROM users WHERE games_played > 0 OR elo_rating > 0").get().c;
  res.json({ list, total });
});

// Solo leaderboard
app.get('/api/quiz/leaderboard/solo', (_req, res) => {
  const category = _req.query.category || 'mixed';
  const list = db.prepare(`
    SELECT username, total_questions, total_correct, best_streak, games_played,
           CASE WHEN total_questions > 0 THEN CAST(ROUND(CAST(total_correct AS REAL) / total_questions * 100) AS INTEGER) ELSE 0 END as accuracy
    FROM solo_scores
    WHERE category = ?
    ORDER BY best_streak DESC, accuracy DESC
    LIMIT 20
  `).all(category);
  const total = db.prepare('SELECT COUNT(DISTINCT username) as c FROM solo_scores WHERE category = ? AND best_streak > 0').get(category).c;
  res.json({ list, total });
});

// Record solo practice result
app.post('/api/quiz/solo/record', auth, (req, res) => {
  const { totalQuestions, totalCorrect, bestStreak, category } = req.body;
  if (typeof totalQuestions !== 'number' || typeof totalCorrect !== 'number') {
    return res.status(400).json({ error: '参数错误' });
  }
  const cat = category || 'mixed';
  const streak = typeof bestStreak === 'number' ? bestStreak : totalCorrect;
  db.prepare(`
    INSERT INTO solo_scores (user_id, category, username, total_questions, total_correct, games_played, best_streak, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'))
    ON CONFLICT(user_id, category) DO UPDATE SET
      username = excluded.username,
      total_questions = total_questions + excluded.total_questions,
      total_correct = total_correct + excluded.total_correct,
      games_played = games_played + 1,
      best_streak = MAX(best_streak, excluded.best_streak),
      updated_at = datetime('now')
  `).run(req.user.id, cat, req.user.username, totalQuestions, totalCorrect, streak);
  res.json({ ok: true });
});

// Solo practice: fetch questions by subjects, difficulty & section_ref
app.get('/api/quiz/solo', (_req, res) => {
  const subjects = _req.query.subjects ? _req.query.subjects.split(',') : [];
  const difficulty = parseInt(_req.query.difficulty) || 0;
  const limit = Math.min(parseInt(_req.query.limit) || 15, 50);
  const sectionRef = _req.query.section_ref || '';

  let sql = 'SELECT * FROM quiz_questions';
  const params = [];
  const conditions = [];

  if (sectionRef) {
    conditions.push('section_ref = ?');
    params.push(sectionRef);
  } else if (subjects.length > 0) {
    conditions.push(`category IN (${subjects.map(() => '?').join(',')})`);
    params.push(...subjects);
  }
  if (difficulty > 0) {
    conditions.push('difficulty = ?');
    params.push(difficulty);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY RANDOM() LIMIT ?';
  params.push(limit);

  const questions = db.prepare(sql).all(...params);
  res.json(questions);
});

// Auth check endpoint: reads grandkidsgo_token from cookie and returns user + token
app.get('/api/auth/check', async (req, res) => {
  // Read token from cookie (sent automatically by browser) or Authorization header
  let token = null;
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)grandkidsgo_token=([^;]+)/);
  if (match) {
    token = decodeURIComponent(match[1]);
  }
  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    return res.json({ code: 'UNAUTHORIZED', authenticated: false });
  }

  try {
    // Verify token and get user from auth-service
    const r = await fetch('http://127.0.0.1:3007/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await r.json();
    if (data.code === 'OK') {
      // Sync local user
      const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(data.data.id);
      if (!existing) {
        db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(data.data.id, data.data.username || data.data.id);
      }
      return res.json({ code: 'OK', data: { ...data.data, token } });
    }
    return res.json(data);
  } catch {
    return res.status(502).json({ code: 'ERROR', message: 'auth-service unavailable' });
  }
});

// Proxy /api/auth/* to auth-service for shared login (cross-app sync)
app.all(/^\/api\/auth\//, async (req, res) => {
  try {
    const targetUrl = 'http://127.0.0.1:3007' + req.originalUrl;
    const r = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
        'Cookie': req.headers.cookie || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    // Forward Set-Cookie headers (auth-service sets grandkidsgo_token/access_token cookies)
    const setCookie = r.headers.getSetCookie?.();
    if (setCookie && setCookie.length > 0) {
      res.setHeader('Set-Cookie', setCookie);
    }
    const data = await r.json();
    res.status(r.status).json(data);
  } catch {
    res.status(502).json({ code: 'ERROR', message: 'auth-service unavailable' });
  }
});

// Serve built frontend
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ===================== WebSocket Server =====================

const wss = new WebSocketServer({ server });
const matchmaking = [];
const rooms = new Map();
const userRooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[crypto.randomInt(chars.length)];
  } while (rooms.has(code));
  return code;
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  let user = null;
  if (token) {
    try { user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
  }
  if (!user) {
    ws.send(JSON.stringify({ type: 'error', message: '请先登录' }));
    ws.close();
    return;
  }

  ws.userId = user.id;
  ws.username = user.username;
  ws.roomCode = null;

  ws.send(JSON.stringify({ type: 'connected', userId: user.id, username: user.username }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'join_queue':
        handleJoinQueue(ws);
        break;
      case 'leave_queue':
        handleLeaveQueue(ws);
        break;
      case 'submit_answer':
        handleSubmitAnswer(ws, msg);
        break;
      case 'leave_room':
        handleLeaveRoom(ws);
        break;
      case 'create_room':
        handleCreateRoom(ws, msg);
        break;
      case 'join_room':
        handleJoinRoom(ws, msg);
        break;
      case 'start_match':
        handleStartMatch(ws);
        break;
      case 'surrender':
        handleSurrender(ws);
        break;
    }
  });

  ws.on('close', () => {
    handleLeaveRoom(ws);
  });
});

// ===================== Room Management =====================

function handleCreateRoom(ws, msg) {
  const code = generateRoomCode();
  const teamSize = Math.min(Math.max(msg.teamSize || 1, 1), 5);

  const room = {
    id: code, code,
    host: ws.userId,
    subjects: msg.subjects || [],
    difficulty: msg.difficulty || 0,
    teamSize,
    team1: [{ ws, userId: ws.userId, username: ws.username }],
    team2: [],
    currentQ: 0, questions: [], scores: {},
    answered: new Set(), timer: null, started: false,
    countdownTimer: null, matchTimer: null, surrenders: new Set(),
  };
  rooms.set(code, room);
  userRooms.set(ws.userId, code);
  ws.roomCode = code;

  db.prepare('INSERT OR REPLACE INTO quiz_rooms (code, host_id, subjects, difficulty, team_size, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(code, ws.userId, (msg.subjects || []).join(','), msg.difficulty || 0, teamSize, 'waiting');

  ws.send(JSON.stringify({
    type: 'room_created',
    roomCode: code,
    teamSize,
    team1: room.team1.map(p => ({ userId: p.userId, username: p.username })),
    team2: [],
  }));
}

function handleJoinRoom(ws, msg) {
  const raw = (msg.roomCode || '').toUpperCase().trim();
  let code = raw;
  let targetTeam = null; // null = auto, 'team1' or 'team2'

  // Parse invite code format: ABCD-T1 or ABCD-T2
  if (raw.endsWith('-T1')) { code = raw.slice(0, -3); targetTeam = 'team1'; }
  else if (raw.endsWith('-T2')) { code = raw.slice(0, -3); targetTeam = 'team2'; }

  const room = rooms.get(code);
  if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间码不正确，请检查后重试' })); return; }
  if (room.started) { ws.send(JSON.stringify({ type: 'error', message: '对战已开始，无法加入' })); return; }

  if (room.team1.find(p => p.userId === ws.userId) || room.team2.find(p => p.userId === ws.userId)) {
    ws.send(JSON.stringify({ type: 'error', message: '你已经在房间里了' })); return;
  }

  // Determine team
  let assignedTeam;
  if (targetTeam === 'team1' && room.team1.length < room.teamSize) {
    assignedTeam = 'team1';
  } else if (targetTeam === 'team2' && room.team2.length < room.teamSize) {
    assignedTeam = 'team2';
  } else {
    // Auto-balance: put on the team with fewer players
    if (room.team1.length <= room.team2.length && room.team1.length < room.teamSize) {
      assignedTeam = 'team1';
    } else if (room.team2.length < room.teamSize) {
      assignedTeam = 'team2';
    } else {
      ws.send(JSON.stringify({ type: 'error', message: '房间已满' })); return;
    }
  }

  room[assignedTeam].push({ ws, userId: ws.userId, username: ws.username });
  userRooms.set(ws.userId, code);
  ws.roomCode = code;

  broadcastRoomUpdate(room);

  // Check auto-start
  checkAndAutoStart(room);
}

function broadcastRoomUpdate(room) {
  const allPlayers = [...room.team1, ...room.team2];
  allPlayers.forEach(p => {
    if (p.ws.readyState === 1) {
      p.ws.send(JSON.stringify({
        type: 'room_update',
        roomCode: room.code,
        teamSize: room.teamSize,
        team1: room.team1.map(x => ({ userId: x.userId, username: x.username })),
        team2: room.team2.map(x => ({ userId: x.userId, username: x.username })),
      }));
    }
  });
}

function checkAndAutoStart(room) {
  if (room.started) return;
  if (room.team1.length < room.teamSize || room.team2.length < room.teamSize) return;

  // Both teams full — start countdown
  if (room.countdownTimer) return; // already counting down

  let countdown = 3;
  broadcastToRoom(room, { type: 'match_starting', countdown });

  room.countdownTimer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      broadcastToRoom(room, { type: 'match_starting', countdown });
    } else {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
      startRoomMatch(room);
    }
  }, 1000);
}

function cancelAutoStart(room) {
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
  }
  if (!room.started) {
    broadcastToRoom(room, { type: 'match_start_cancelled' });
  }
}

function broadcastToRoom(room, msg) {
  const allPlayers = [...room.team1, ...room.team2];
  allPlayers.forEach(p => {
    if (p.ws.readyState === 1) p.ws.send(JSON.stringify(msg));
  });
}

function handleStartMatch(ws) {
  const code = ws.roomCode;
  const room = code ? rooms.get(code) : null;
  if (!room) return;
  if (room.host !== ws.userId) { ws.send(JSON.stringify({ type: 'error', message: '只有房主可以开始' })); return; }
  if (room.team1.length < room.teamSize || room.team2.length < room.teamSize) {
    ws.send(JSON.stringify({ type: 'error', message: '两队人数不足' })); return;
  }
  // Cancel any existing countdown and start immediately
  cancelAutoStart(room);
  startRoomMatch(room);
}

function startRoomMatch(room) {
  if (room.started) return;
  room.started = true;
  room.currentQ = 0;
  room.scores = {};
  const allPlayers = [...room.team1, ...room.team2];
  allPlayers.forEach(p => { room.scores[p.userId] = 0; });

  let sql = 'SELECT * FROM quiz_questions';
  const params = [];
  const conditions = [];
  if (room.subjects && room.subjects.length > 0) {
    conditions.push(`category IN (${room.subjects.map(() => '?').join(',')})`);
    params.push(...room.subjects);
  }
  if (room.difficulty > 0) {
    conditions.push('difficulty = ?');
    params.push(room.difficulty);
  }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY RANDOM() LIMIT 10';

  room.questions = db.prepare(sql).all(...params);
  if (room.questions.length < 3) {
    room.questions = db.prepare('SELECT * FROM quiz_questions ORDER BY RANDOM() LIMIT 10').all();
  }

  allPlayers.forEach(p => {
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(p.userId);
    if (!existing) db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(p.userId, p.username);
  });

  allPlayers.forEach(p => {
    if (p.ws.readyState === 1) {
      p.ws.send(JSON.stringify({
        type: 'match_start',
        totalQuestions: room.questions.length,
        team1: room.team1.map(x => ({ userId: x.userId, username: x.username })),
        team2: room.team2.map(x => ({ userId: x.userId, username: x.username })),
      }));
    }
  });

  // 30-minute max match duration
  room.matchTimer = setTimeout(() => endRoomMatch(room, 'timeout'), 30 * 60 * 1000);

  setTimeout(() => sendRoomQuestion(room), 2000);
}

function sendRoomQuestion(room) {
  if (!rooms.has(room.code)) return; // already ended by surrender/timeout
  if (room.currentQ >= room.questions.length) { endRoomMatch(room); return; }
  room.answered = new Set();
  const q = room.questions[room.currentQ];
  const payload = {
    type: 'question',
    questionNumber: room.currentQ + 1,
    totalQuestions: room.questions.length,
    question: q.question,
    options: JSON.parse(q.options),
    category: q.category,
    difficulty: q.difficulty,
    timeLimit: 10,
  };
  broadcastToRoom(room, payload);

  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    room.currentQ++;
    broadcastToRoom(room, { type: 'timeout' });
    setTimeout(() => sendRoomQuestion(room), 1500);
  }, 10000);
}

function endRoomMatch(room, reason) {
  if (room.timer) clearTimeout(room.timer);
  if (room.matchTimer) clearTimeout(room.matchTimer);

  const team1Score = room.team1.reduce((s, p) => s + (room.scores[p.userId] || 0), 0);
  const team2Score = room.team2.reduce((s, p) => s + (room.scores[p.userId] || 0), 0);

  // Determine winner: surrender overrides score
  let winners;
  if (reason === 'surrender_team1') winners = room.team2;
  else if (reason === 'surrender_team2') winners = room.team1;
  else winners = team1Score > team2Score ? room.team1 : team2Score > team1Score ? room.team2 : null;

  // Update DB: all players
  const allPlayers = [...room.team1, ...room.team2];
  if (winners) {
    winners.forEach(p => db.prepare('UPDATE users SET games_played = games_played + 1, games_won = games_won + 1, elo_rating = elo_rating + 10 WHERE id = ?').run(p.userId));
    const losers = winners === room.team1 ? room.team2 : room.team1;
    losers.forEach(p => db.prepare('UPDATE users SET games_played = games_played + 1, elo_rating = GREATEST(elo_rating - 5, 100) WHERE id = ?').run(p.userId));
  } else {
    allPlayers.forEach(p => db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?').run(p.userId));
  }

  const matchId = crypto.randomUUID();
  db.prepare('INSERT INTO quiz_matches (id, room_code, player1_id, questions_count, status, finished_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))')
    .run(matchId, room.code, room.host, room.questions.length, 'finished');

  // Send result to each player
  allPlayers.forEach(p => {
    if (p.ws.readyState === 1) {
      const inTeam1 = room.team1.includes(p);
      const myTeam = inTeam1 ? room.team1 : room.team2;
      const otherTeam = inTeam1 ? room.team2 : room.team1;
      const myScore = inTeam1 ? team1Score : team2Score;
      const otherScore = inTeam1 ? team2Score : team1Score;

      const myTeamMembers = myTeam.filter(x => x.userId !== p.userId).map(x => x.username);
      const opponents = otherTeam.map(x => x.username);

      let isWinner, isDraw, message;
      if (reason === 'surrender_team1' || reason === 'surrender_team2') {
        const myTeamSurrendered = (reason === 'surrender_team1' && inTeam1) || (reason === 'surrender_team2' && !inTeam1);
        isWinner = !myTeamSurrendered;
        isDraw = false;
        message = myTeamSurrendered ? '🏳️ 你的团队投降了' : '🎉 对手投降，团队获胜！';
      } else if (reason === 'timeout') {
        isWinner = myScore > otherScore;
        isDraw = myScore === otherScore;
        message = myScore > otherScore ? '🕐 时间到！团队领先获胜！' : myScore === otherScore ? '🕐 时间到！平局' : '🕐 时间到！团队惜败';
      } else {
        isWinner = myScore > otherScore;
        isDraw = myScore === otherScore;
        message = myScore > otherScore ? '🎉 团队获胜！' : myScore === otherScore ? '🤝 平局！' : '💪 下次加油！';
      }

      p.ws.send(JSON.stringify({
        type: 'match_end',
        team1: room.team1.map(x => ({ userId: x.userId, username: x.username, score: room.scores[x.userId] || 0 })),
        team2: room.team2.map(x => ({ userId: x.userId, username: x.username, score: room.scores[x.userId] || 0 })),
        teamScore: myScore,
        opponentScore: otherScore,
        teamMembers: myTeamMembers,
        opponents,
        isWinner,
        isDraw,
        message,
      }));
    }
  });

  rooms.delete(room.code);
  allPlayers.forEach(p => { userRooms.delete(p.userId); p.ws.roomCode = null; });
}

function handleSubmitAnswer(ws, msg) {
  const code = ws.roomCode;
  const room = code ? rooms.get(code) : null;
  if (!room) return;
  if (room.answered.has(ws.userId)) return;
  room.answered.add(ws.userId);
  const q = room.questions[room.currentQ];
  const correct = q && msg.answer === q.answer;
  if (correct) room.scores[ws.userId] = (room.scores[ws.userId] || 0) + (room.answered.size === 1 ? 10 : 5);

  broadcastToRoom(room, {
    type: 'answer_result',
    userId: ws.userId,
    username: ws.username,
    correct,
    scores: room.scores,
    answeredCount: room.answered.size,
    totalPlayers: room.team1.length + room.team2.length,
  });

  const totalPlayers = room.team1.length + room.team2.length;
  if (room.answered.size >= totalPlayers) {
    if (room.timer) clearTimeout(room.timer);
    room.currentQ++;
    setTimeout(() => sendRoomQuestion(room), 1500);
  }
}

function handleSurrender(ws) {
  const code = ws.roomCode;
  const room = code ? rooms.get(code) : null;
  if (!room || !room.started) return;

  if (!room.surrenders) room.surrenders = new Set();
  if (room.surrenders.has(ws.userId)) return;
  room.surrenders.add(ws.userId);

  const inTeam1 = room.team1.some(p => p.userId === ws.userId);
  const teamPlayers = inTeam1 ? room.team1 : room.team2;
  const teamSurrenderCount = teamPlayers.filter(p => room.surrenders.has(p.userId)).length;

  broadcastToRoom(room, {
    type: 'surrender_update',
    userId: ws.userId,
    username: ws.username,
    teamSurrenders: {
      team1: room.team1.filter(p => room.surrenders.has(p.userId)).map(p => p.username),
      team2: room.team2.filter(p => room.surrenders.has(p.userId)).map(p => p.username),
    },
  });

  // Check if >50% of a team surrendered
  if (teamSurrenderCount > teamPlayers.length / 2) {
    const surrenderTeam = inTeam1 ? 'team1' : 'team2';
    endRoomMatch(room, `surrender_${surrenderTeam}`);
  }
}

function handleLeaveRoom(ws) {
  handleLeaveQueue(ws);
  const code = ws.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) { userRooms.delete(ws.userId); ws.roomCode = null; return; }

  // If match is active, treat as surrender instead of leave
  if (room.started) {
    handleSurrender(ws);
    return;
  }

  // Remove from both teams
  room.team1 = room.team1.filter(p => p.userId !== ws.userId);
  room.team2 = room.team2.filter(p => p.userId !== ws.userId);
  userRooms.delete(ws.userId);
  ws.roomCode = null;

  if (room.team1.length === 0 && room.team2.length === 0) {
    cancelAutoStart(room);
    if (room.timer) clearTimeout(room.timer);
    rooms.delete(code);
    return;
  }

  // Cancel auto-start if someone left during countdown
  cancelAutoStart(room);

  // Reassign host if needed
  if (room.host === ws.userId) {
    if (room.team1.length > 0) room.host = room.team1[0].userId;
    else if (room.team2.length > 0) room.host = room.team2[0].userId;
  }

  broadcastRoomUpdate(room);
}

// ===================== Quick Match (1v1) =====================

function handleJoinQueue(ws) {
  handleLeaveQueue(ws);
  matchmaking.push(ws);

  // Check opponent counts by teamSize (default 1v1)
  const needed = 2; // 2 players total for 1v1
  if (matchmaking.length >= needed) {
    const p1 = matchmaking.shift();
    const p2 = matchmaking.shift();
    if (p1.readyState === 1 && p2.readyState === 1) {
      const code = generateRoomCode();
      const room = {
        id: code, code,
        host: p1.userId,
        subjects: [], difficulty: 0,
        teamSize: 1,
        team1: [{ ws: p1, userId: p1.userId, username: p1.username }],
        team2: [{ ws: p2, userId: p2.userId, username: p2.username }],
        currentQ: 0, questions: [], scores: {},
        answered: new Set(), timer: null, started: true,
        countdownTimer: null, matchTimer: null, surrenders: new Set(),
      };
      rooms.set(code, room);
      userRooms.set(p1.userId, code); p1.roomCode = code;
      userRooms.set(p2.userId, code); p2.roomCode = code;

      room.questions = db.prepare('SELECT * FROM quiz_questions ORDER BY RANDOM() LIMIT 5').all();
      [p1, p2].forEach(p => {
        const e = db.prepare('SELECT id FROM users WHERE id = ?').get(p.userId);
        if (!e) db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(p.userId, p.username);
      });

      [p1, p2].forEach(p => {
        if (p.readyState === 1) {
          p.send(JSON.stringify({ type: 'match_found', roomId: code, opponent: p === p1 ? p2.username : p1.username, totalQuestions: room.questions.length }));
        }
      });
      setTimeout(() => sendRoomQuestion(room), 1500);
    } else {
      if (p1.readyState === 1) matchmaking.push(p1);
      if (p2.readyState === 1) matchmaking.push(p2);
    }
  }
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({
      type: 'queue_status',
      position: matchmaking.length,
      message: matchmaking.length >= 2 ? '正在匹配...' : '等待对手中...',
    }));
  }
}

function handleLeaveQueue(ws) {
  const idx = matchmaking.indexOf(ws);
  if (idx !== -1) matchmaking.splice(idx, 1);
}

// Fallback for SPA routing
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[grandkidsgo-tiaozhan] running on port ${PORT}`);
});

export default app;
