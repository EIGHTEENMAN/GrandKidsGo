const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { revokeAllUserSessions, generateTokens, setTokenCookie } = require('../utils/jwt');

const router = express.Router();

// GET /api/user/profile - Get user profile
router.get('/profile', authenticate, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.phone, u.nickname, u.avatar, u.gender, u.birthday, u.role, u.created_at,
           p.balance as points
    FROM users u
    LEFT JOIN points p ON p.user_id = u.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ code: 'USER_NOT_FOUND', message: '用户不存在' });
  }

  const children = db.prepare(`SELECT * FROM children WHERE user_id = ? ORDER BY created_at ASC`).all(req.user.id);

  res.json({ code: 'OK', data: { ...user, children } });
});

// PUT /api/user/profile - Update user profile
router.put('/profile', authenticate, (req, res) => {
  const { nickname, avatar, gender, birthday } = req.body;
  const updates = [];
  const values = [];

  if (nickname !== undefined) { updates.push('nickname = ?'); values.push(nickname); }
  if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
  if (gender !== undefined) { updates.push('gender = ?'); values.push(gender); }
  if (birthday !== undefined) { updates.push('birthday = ?'); values.push(birthday); }

  if (updates.length === 0) {
    return res.status(400).json({ code: 'NO_CHANGES', message: '没有需要更新的字段' });
  }

  updates.push("updated_at = datetime('now')");
  values.push(req.user.id);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const user = db.prepare(`SELECT id, username, phone, nickname, avatar, gender, birthday FROM users WHERE id = ?`).get(req.user.id);
  res.json({ code: 'OK', data: user });
});

// PUT /api/user/password - Change password
router.put('/password', authenticate, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '旧密码和新密码不能为空' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ code: 'INVALID_PASSWORD', message: '新密码长度不能少于6位' });
  }

  const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(401).json({ code: 'WRONG_PASSWORD', message: '旧密码错误' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, req.user.id);
  revokeAllUserSessions(req.user.id);

  res.json({ code: 'OK', message: '密码已修改，请重新登录' });
});

// GET /api/user/points - Get point balance & transactions
router.get('/points', authenticate, (req, res) => {
  const points = db.prepare(`SELECT balance, total_earned, total_spent FROM points WHERE user_id = ?`).get(req.user.id);
  const transactions = db.prepare(`
    SELECT id, amount, type, description, created_at
    FROM point_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  res.json({
    code: 'OK',
    data: {
      balance: points?.balance || 0,
      totalEarned: points?.total_earned || 0,
      totalSpent: points?.total_spent || 0,
      transactions,
    },
  });
});

// POST /api/user/points/earn - Earn points for various activities
// types: study_checkin (每日学习+2), study_stage_complete (完成一关+10),
//        streak_bonus (连续学习奖励+5起), daily_checkin (每日签到+5)
const POINTS_MAP = {
  study_checkin: 2,
  study_stage_complete: 10,
  streak_bonus: 5,
  daily_checkin: 5,
};

router.post('/points/earn', authenticate, (req, res) => {
  const { type, description } = req.body;
  const POINTS_MAP = { study_checkin: 2, study_stage_complete: 10, streak_bonus: 5, daily_checkin: 5 };
  if (!type || !POINTS_MAP[type]) {
    return res.status(400).json({ code: 'INVALID_TYPE', message: '无效的积分类型' });
  }

  const amount = POINTS_MAP[type];
  const DESCS = { study_checkin: '每日学习', study_stage_complete: '完成学习关卡', streak_bonus: '连续学习奖励', daily_checkin: '每日签到' };
  const desc = description || DESCS[type];

  try {
    // 防同类型今天重复（study_checkin / daily_checkin）
    if (type === 'study_checkin' || type === 'daily_checkin') {
      const today = new Date().toISOString().slice(0, 10);
      const existing = db.prepare(`SELECT id FROM point_transactions WHERE user_id = ? AND type = ? AND date(created_at) = ?`).get(req.user.id, type, today);
      if (existing) {
        return res.json({ code: 'OK', data: { earned: 0, already_claimed: true, balance: db.prepare(`SELECT balance FROM points WHERE user_id = ?`).get(req.user.id)?.balance || 0 } });
      }
    }

    // 确保 points 记录存在
    const exist = db.prepare(`SELECT user_id FROM points WHERE user_id = ?`).get(req.user.id);
    if (!exist) {
      db.prepare(`INSERT INTO points (user_id, balance, total_earned, total_spent) VALUES (?, 0, 0, 0)`).run(req.user.id);
    }

    // 添加积分
    db.prepare(`UPDATE points SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE user_id = ?`).run(amount, amount, req.user.id);

    // 记录交易
    db.prepare(`INSERT INTO point_transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), req.user.id, amount, type, desc);

    const balance = db.prepare(`SELECT balance FROM points WHERE user_id = ?`).get(req.user.id);
    res.json({ code: 'OK', data: { earned: amount, balance: balance?.balance || 0 } });
  } catch (e) {
    console.error('[points/earn error]', e.message);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: e.message });
  }
});
router.post('/wechat-bind', authenticate, (req, res) => {
  const { openid } = req.body;
  if (!openid) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'openid 不能为空' });
  }

  const existing = db.prepare(`SELECT id FROM users WHERE wechat_openid = ?`).get(openid);
  if (existing) {
    return res.status(409).json({ code: 'WECHAT_ALREADY_BOUND', message: '该微信已绑定其他账号' });
  }

  db.prepare(`UPDATE users SET wechat_openid = ?, updated_at = datetime('now') WHERE id = ?`).run(openid, req.user.id);
  res.json({ code: 'OK' });
});

// ─── Children CRUD ──────────────────────────────────────────

// GET /api/user/children - Get all children for current user
router.get('/children', authenticate, (req, res) => {
  const children = db.prepare(
    `SELECT * FROM children WHERE user_id = ? ORDER BY created_at ASC`
  ).all(req.user.id);
  res.json({ code: 'OK', data: children });
});

// POST /api/user/children - Add a child
router.post('/children', authenticate, (req, res) => {
  const { nickname, gender, birthday, avatar } = req.body;
  if (!nickname) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '孩子昵称不能为空' });
  }
  const id = uuidv4();
  db.prepare(
    `INSERT INTO children (id, user_id, nickname, gender, birthday, avatar) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.user.id, nickname, gender || null, birthday || null, avatar || null);
  const child = db.prepare(`SELECT * FROM children WHERE id = ?`).get(id);
  res.status(201).json({ code: 'OK', data: child });
});

// PUT /api/user/children/:id - Update a child
router.put('/children/:id', authenticate, (req, res) => {
  const { nickname, gender, birthday, avatar } = req.body;
  const existing = db.prepare(`SELECT id FROM children WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!existing) {
    return res.status(404).json({ code: 'NOT_FOUND', message: '孩子信息不存在' });
  }
  const updates = [];
  const values = [];
  if (nickname !== undefined) { updates.push('nickname = ?'); values.push(nickname); }
  if (gender !== undefined) { updates.push('gender = ?'); values.push(gender); }
  if (birthday !== undefined) { updates.push('birthday = ?'); values.push(birthday); }
  if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
  if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
  if (updates.length > 0) {
    values.push(req.params.id);
    db.prepare(`UPDATE children SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  const child = db.prepare(`SELECT * FROM children WHERE id = ?`).get(req.params.id);
  res.json({ code: 'OK', data: child });
});

// DELETE /api/user/children/:id - Remove a child
router.delete('/children/:id', authenticate, (req, res) => {
  const existing = db.prepare(`SELECT id FROM children WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!existing) {
    return res.status(404).json({ code: 'NOT_FOUND', message: '孩子信息不存在' });
  }
  db.prepare(`DELETE FROM learning_progress WHERE child_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM children WHERE id = ?`).run(req.params.id);
  res.json({ code: 'OK' });
});

// ─── Game Data Sync ─────────────────────────────────────────

// PUT /api/user/children/:id/game-data - Update game data (level, score)
router.put('/children/:id/game-data', authenticate, (req, res) => {
  const { gameLevel, gameScore } = req.body;
  const existing = db.prepare(`SELECT id FROM children WHERE id = ?`).get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 'NOT_FOUND', message: '孩子不存在' });
  }
  const updates = [];
  const values = [];
  if (gameLevel !== undefined) { updates.push('game_level = ?'); values.push(gameLevel); }
  if (gameScore !== undefined) { updates.push('game_score = ?'); values.push(gameScore); }
  if (updates.length > 0) {
    values.push(req.params.id);
    db.prepare(`UPDATE children SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  const child = db.prepare(`SELECT id, nickname, game_level, game_score FROM children WHERE id = ?`).get(req.params.id);
  res.json({ code: 'OK', data: child });
});

// PUT /api/user/children/:id/challenge-points - Sync challenge points
router.put('/children/:id/challenge-points', authenticate, (req, res) => {
  const { challengePoints } = req.body;
  if (challengePoints === undefined) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'challengePoints 不能为空' });
  }
  const existing = db.prepare(`SELECT id FROM children WHERE id = ?`).get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 'NOT_FOUND', message: '孩子不存在' });
  }
  db.prepare(`UPDATE children SET challenge_points = ? WHERE id = ?`).run(challengePoints, req.params.id);
  // Update rank (simple: count children with higher points + 1)
  const rank = db.prepare(`SELECT COUNT(*) + 1 as rank FROM children WHERE challenge_points > ?`).get(challengePoints);
  db.prepare(`UPDATE children SET challenge_rank = ? WHERE id = ?`).run(rank.rank, req.params.id);
  const child = db.prepare(`SELECT id, nickname, challenge_points, challenge_rank FROM children WHERE id = ?`).get(req.params.id);
  res.json({ code: 'OK', data: child });
});

// GET /api/user/ranking - Get ranking for a specific child
router.get('/ranking', authenticate, (req, res) => {
  const { childId } = req.query;
  if (!childId) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'childId 不能为空' });
  }
  const child = db.prepare(`SELECT id, nickname, challenge_points, challenge_rank FROM children WHERE id = ?`).get(childId);
  if (!child) {
    return res.status(404).json({ code: 'NOT_FOUND', message: '孩子不存在' });
  }
  // Top 20 leaderboard
  const top20 = db.prepare(`
    SELECT c.id, c.nickname, c.avatar, c.challenge_points, c.challenge_rank
    FROM children c ORDER BY c.challenge_points DESC LIMIT 20
  `).all();
  res.json({ code: 'OK', data: { me: child, leaderboard: top20 } });
});

// ─── Learning Progress ──────────────────────────────────────

// GET /api/user/learning-progress - Get learning progress for a child or all children
router.get('/learning-progress', authenticate, (req, res) => {
  const { childId } = req.query;
  if (childId) {
    const data = db.prepare(`SELECT * FROM learning_progress WHERE child_id = ?`).all(childId);
    return res.json({ code: 'OK', data });
  }
  // If no childId, get progress for all children of this user
  const children = db.prepare(`SELECT id FROM children WHERE user_id = ?`).all(req.user.id);
  const childIds = children.map(c => c.id);
  if (childIds.length === 0) return res.json({ code: 'OK', data: [] });
  const placeholders = childIds.map(() => '?').join(',');
  const allProgress = db.prepare(`SELECT * FROM learning_progress WHERE child_id IN (${placeholders})`).all(...childIds);
  res.json({ code: 'OK', data: allProgress });
});

// PUT /api/user/learning-progress - Update learning progress (incremental)
router.put('/learning-progress', authenticate, (req, res) => {
  const { childId, subject, itemsLearned, timeSpentMinutes, accuracy } = req.body;
  if (!childId || !subject) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'childId 和 subject 不能为空' });
  }
  const validSubjects = ['poetry', 'classics', 'general', 'english', 'challenge'];
  if (!validSubjects.includes(subject)) {
    return res.status(400).json({ code: 'INVALID_SUBJECT', message: `subject 必须是: ${validSubjects.join(', ')}` });
  }

  const existing = db.prepare(`SELECT * FROM learning_progress WHERE child_id = ? AND subject = ?`).get(childId, subject);

  if (existing) {
    // Incremental update
    const updates = [];
    const values = [];
    if (itemsLearned !== undefined) { updates.push('items_learned = items_learned + ?'); values.push(itemsLearned); }
    if (timeSpentMinutes !== undefined) { updates.push('time_spent_minutes = time_spent_minutes + ?'); values.push(timeSpentMinutes); }
    if (accuracy !== undefined) { updates.push('accuracy = ?'); values.push(accuracy); }
    updates.push("last_studied_at = datetime('now')");
    updates.push("updated_at = datetime('now')");
    values.push(childId, subject);
    db.prepare(`UPDATE learning_progress SET ${updates.join(', ')} WHERE child_id = ? AND subject = ?`).run(...values);
  } else {
    // Create new
    const id = uuidv4();
    db.prepare(`
      INSERT INTO learning_progress (id, child_id, subject, items_learned, time_spent_minutes, accuracy, last_studied_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, childId, subject, itemsLearned || 0, timeSpentMinutes || 0, accuracy || 0);
  }

  // Log daily study activity
  const today = new Date().toISOString().split('T')[0];
  const existingLog = db.prepare(`SELECT * FROM study_logs WHERE child_id = ? AND date = ? AND subject = ?`).get(childId, today, subject);
  if (existingLog) {
    const updates = [];
    const vals = [];
    if (itemsLearned !== undefined) { updates.push('items_learned = items_learned + ?'); vals.push(itemsLearned); }
    if (timeSpentMinutes !== undefined) { updates.push('time_spent_minutes = time_spent_minutes + ?'); vals.push(timeSpentMinutes); }
    if (updates.length > 0) {
      vals.push(childId, today, subject);
      db.prepare(`UPDATE study_logs SET ${updates.join(', ')} WHERE child_id = ? AND date = ? AND subject = ?`).run(...vals);
    }
  } else {
    const logId = uuidv4();
    db.prepare(`INSERT INTO study_logs (id, child_id, date, subject, items_learned, time_spent_minutes) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(logId, childId, today, subject, itemsLearned || 0, timeSpentMinutes || 0);
  }

  const progress = db.prepare(`SELECT * FROM learning_progress WHERE child_id = ? AND subject = ?`).get(childId, subject);
  res.json({ code: 'OK', data: progress });
});

// GET /api/user/learning-progress/summary - Get aggregated progress summary (for parent view)
router.get('/learning-progress/summary', authenticate, (req, res) => {
  const children = db.prepare(`SELECT * FROM children WHERE user_id = ? ORDER BY created_at ASC`).all(req.user.id);
  const childIds = children.map(c => c.id);
  if (childIds.length === 0) return res.json({ code: 'OK', data: [] });

  const placeholders = childIds.map(() => '?').join(',');
  const allProgress = db.prepare(`SELECT * FROM learning_progress WHERE child_id IN (${placeholders})`).all(...childIds);

  // Group by child_id
  const summary = children.map(child => ({
    ...child,
    progress: allProgress.filter(p => p.child_id === child.id),
  }));

  res.json({ code: 'OK', data: summary });
});

// GET /api/user/learning-report - Get detailed learning report for calendar & achievements
router.get('/learning-report', authenticate, (req, res) => {
  const { childId } = req.query;
  if (!childId) return res.status(400).json({ code: 'INVALID_INPUT', message: 'childId 必填' });

  // Verify child belongs to this user
  const child = db.prepare(`SELECT * FROM children WHERE id = ? AND user_id = ?`).get(childId, req.user.id);
  if (!child) return res.status(403).json({ code: 'FORBIDDEN', message: '无权限访问' });

  // 1. Daily logs for the last 365 days
  const logs = db.prepare(`
    SELECT date, subject, items_learned, time_spent_minutes
    FROM study_logs WHERE child_id = ? AND date >= date('now', '-365 days')
    ORDER BY date ASC
  `).all(childId);

  // Group logs by date
  const dailyMap = {};
  logs.forEach(log => {
    if (!dailyMap[log.date]) dailyMap[log.date] = {};
    dailyMap[log.date][log.subject] = {
      items: log.items_learned,
      minutes: log.time_spent_minutes,
    };
  });

  // 2. Subject summary
  const summary = db.prepare(`SELECT * FROM learning_progress WHERE child_id = ?`).all(childId);

  // 3. Streak calculation
  const allDates = [...new Set(logs.map(l => l.date))].sort();
  const dateSet = new Set(allDates);

  // Current streak: consecutive days ending with the most recent study day (must be today or yesterday)
  let currentStreak = 0;
  if (allDates.length > 0) {
    const lastDate = new Date(allDates[allDates.length - 1]);
    const now = new Date();
    const daysSince = Math.round((now - lastDate) / (1000 * 60 * 60 * 24));
    if (daysSince <= 1) {
      currentStreak = 1;
      for (let i = allDates.length - 2; i >= 0; i--) {
        const curr = new Date(allDates[i]);
        const prev = new Date(allDates[i + 1]);
        const diff = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
        if (diff === 1) currentStreak++;
        else break;
      }
    }
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 1;
  for (let i = 1; i < allDates.length; i++) {
    const prev = new Date(allDates[i - 1]);
    const curr = new Date(allDates[i]);
    const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) tempStreak++;
    else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // 4. Total stats
  const totalItems = summary.reduce((s, p) => s + p.items_learned, 0);
  const totalMinutes = summary.reduce((s, p) => s + p.time_spent_minutes, 0);

  res.json({
    code: 'OK',
    data: {
      dailyLogs: Object.entries(dailyMap).map(([date, subjects]) => ({ date, subjects })),
      subjectSummary: summary,
      streak: { current: currentStreak, longest: longestStreak },
      totals: { items: totalItems, minutes: totalMinutes },
    },
  });
});

// ─── Child Independent Login ─────────────────────────────────

// POST /api/user/children/login - (已移除，children 不再存 phone)
router.post('/children/login', (_req, res) => {
  res.status(410).json({ code: 'GONE', message: '子账号独立登录已停用，请使用家长账号管理' });
});

// POST /api/user/children/set-password - Set child independent password
router.post('/children/set-password', authenticate, (req, res) => {
  const { childId, password } = req.body;
  if (!childId || !password) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'childId 和密码不能为空' });
  }
  if (password.length < 6) {
    return res.status(400).json({ code: 'INVALID_PASSWORD', message: '密码长度不能少于6位' });
  }
  const existing = db.prepare(`SELECT id FROM children WHERE id = ?`).get(childId);
  if (!existing) {
    return res.status(404).json({ code: 'NOT_FOUND', message: '孩子不存在' });
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`UPDATE children SET password_hash = ? WHERE id = ?`).run(hash, childId);
  res.json({ code: 'OK' });
});

module.exports = router;

// ─── Youth Mode ─────────────────────────────────────────────

// GET /api/user/youth-mode - Get youth mode settings for current user
router.get('/youth-mode', authenticate, (req, res) => {
  const settings = db.prepare(`SELECT * FROM youth_mode_settings WHERE user_id = ?`).get(req.user.id);
  const consent = db.prepare(`SELECT parent_name, parent_phone, consent_at FROM parent_consent WHERE child_user_id = ?`).get(req.user.id);

  // Get today's usage
  const today = new Date().toISOString().slice(0, 10);
  const usage = db.prepare(`SELECT minutes_used FROM daily_usage WHERE user_id = ? AND date = ?`).get(req.user.id, today);

  res.json({
    code: 'OK',
    data: {
      settings: settings || { enabled: 0, daily_time_limit_minutes: 40, night_mode_enabled: 1, social_limited: 1 },
      consent: consent || null,
      todayMinutes: usage?.minutes_used || 0,
    },
  });
});

// PUT /api/user/youth-mode - Update youth mode settings
router.put('/youth-mode', authenticate, (req, res) => {
  const { enabled, dailyTimeLimit, nightModeEnabled, socialLimited } = req.body;
  const existing = db.prepare(`SELECT user_id FROM youth_mode_settings WHERE user_id = ?`).get(req.user.id);

  if (existing) {
    const updates = [];
    const values = [];
    if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled ? 1 : 0); }
    if (dailyTimeLimit !== undefined) { updates.push('daily_time_limit_minutes = ?'); values.push(Math.min(Math.max(dailyTimeLimit, 15), 120)); }
    if (nightModeEnabled !== undefined) { updates.push('night_mode_enabled = ?'); values.push(nightModeEnabled ? 1 : 0); }
    if (socialLimited !== undefined) { updates.push('social_limited = ?'); values.push(socialLimited ? 1 : 0); }
    updates.push("updated_at = datetime('now')");
    values.push(req.user.id);
    db.prepare(`UPDATE youth_mode_settings SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);
  } else {
    db.prepare(`INSERT INTO youth_mode_settings (user_id, enabled, daily_time_limit_minutes, night_mode_enabled, social_limited) VALUES (?, ?, ?, ?, ?)`)
      .run(req.user.id, enabled !== false ? 1 : 0, dailyTimeLimit || 40, nightModeEnabled !== false ? 1 : 0, socialLimited !== false ? 1 : 0);
  }

  const settings = db.prepare(`SELECT * FROM youth_mode_settings WHERE user_id = ?`).get(req.user.id);
  res.json({ code: 'OK', data: settings });
});

// POST /api/user/youth-mode/track - Track usage time (incremental)
router.post('/youth-mode/track', authenticate, (req, res) => {
  const { minutes } = req.body;
  if (!minutes || minutes < 1) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'minutes 必须大于 0' });
  }

  const settings = db.prepare(`SELECT enabled, daily_time_limit_minutes FROM youth_mode_settings WHERE user_id = ?`).get(req.user.id);
  if (!settings || !settings.enabled) {
    return res.json({ code: 'OK', data: { allowed: true, remaining: -1 } });
  }

  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare(`SELECT id, minutes_used FROM daily_usage WHERE user_id = ? AND date = ?`).get(req.user.id, today);

  if (existing) {
    db.prepare(`UPDATE daily_usage SET minutes_used = minutes_used + ?, updated_at = datetime('now') WHERE id = ?`).run(minutes, existing.id);
  } else {
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`INSERT INTO daily_usage (id, user_id, date, minutes_used) VALUES (?, ?, ?, ?)`).run(uuidv4(), req.user.id, today, minutes);
  }

  const updated = db.prepare(`SELECT minutes_used FROM daily_usage WHERE user_id = ? AND date = ?`).get(req.user.id, today);
  const remaining = settings.daily_time_limit_minutes - (updated?.minutes_used || 0);

  res.json({ code: 'OK', data: { allowed: remaining > 0, remaining: Math.max(0, remaining), totalUsed: updated?.minutes_used || 0 } });
});

// GET /api/user/youth-mode/check - Check if user is currently allowed to use
router.get('/youth-mode/check', authenticate, (req, res) => {
  const settings = db.prepare(`SELECT * FROM youth_mode_settings WHERE user_id = ?`).get(req.user.id);

  const result = { enabled: false, allowed: true, reason: null, remaining: -1 };
  if (!settings || !settings.enabled) {
    return res.json({ code: 'OK', data: result });
  }

  result.enabled = true;

  // Check night mode (22:00 - 06:00)
  if (settings.night_mode_enabled) {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      result.allowed = false;
      result.reason = '夜间休息时段（22:00-06:00）暂停使用';
      return res.json({ code: 'OK', data: result });
    }
  }

  // Check daily limit
  const today = new Date().toISOString().slice(0, 10);
  const usage = db.prepare(`SELECT minutes_used FROM daily_usage WHERE user_id = ? AND date = ?`).get(req.user.id, today);
  const used = usage?.minutes_used || 0;
  result.remaining = Math.max(0, settings.daily_time_limit_minutes - used);

  if (used >= settings.daily_time_limit_minutes) {
    result.allowed = false;
    result.reason = `今日学习时长已达上限（${settings.daily_time_limit_minutes} 分钟）`;
  }

  res.json({ code: 'OK', data: result });
});

// DELETE /api/user/account - Delete user account
router.delete('/account', authenticate, (req, res) => {
  const userId = req.user.id;

  const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
  if (!user) {
    return res.status(404).json({ code: 'USER_NOT_FOUND', message: '用户不存在' });
  }

  const tx = db.transaction(() => {
    revokeAllUserSessions(userId);
    db.prepare(`DELETE FROM point_transactions WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM points WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM daily_usage WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM youth_mode_settings WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM parent_consent WHERE child_user_id = ?`).run(userId);
    db.prepare(`DELETE FROM learning_progress WHERE child_id IN (SELECT id FROM children WHERE user_id = ?)`).run(userId);
    db.prepare(`DELETE FROM children WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  });

  tx();

  res.json({ code: 'OK', message: '账号已注销' });
});
