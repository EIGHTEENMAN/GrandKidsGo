/**
 * LLM Chat 代理路由 — POST /api/llm/chat
 *
 * 功能：
 * - 鉴权（需要登录）
 * - 注入 child 上下文
 * - 调用 MiniMax (OpenAI 兼容) 流式接口
 * - 限流：每 child 10/min、100/day
 * - 输出 SSE 流
 */

const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── 限流（SQLite 计数） ───
const RATE_LIMIT_MIN = 10;        // 每分钟 10 条
const RATE_LIMIT_DAY = 100;       // 每天 100 条

// 初始化表（lazy）
let tableInit = false;
function ensureTable() {
  if (tableInit) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_llm_child_time ON llm_usage(child_id, created_at);
  `);
  tableInit = true;
}

function checkRate(childId) {
  ensureTable();
  // 最近 1 分钟
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const minCount = db.prepare(`
    SELECT count(*) as c FROM llm_usage WHERE child_id = ? AND created_at > ?
  `).get(childId, oneMinAgo).c;
  if (minCount >= RATE_LIMIT_MIN) {
    return { ok: false, reason: 'rate_limit_minute', retryAfter: 60 };
  }
  // 今天
  const todayStart = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').toISOString();
  const dayCount = db.prepare(`
    SELECT count(*) as c FROM llm_usage WHERE child_id = ? AND created_at > ?
  `).get(childId, todayStart).c;
  if (dayCount >= RATE_LIMIT_DAY) {
    return { ok: false, reason: 'rate_limit_day', retryAfter: 86400 };
  }
  return { ok: true };
}

function recordUsage(childId, userId, tokensIn, tokensOut) {
  try {
    db.prepare(`
      INSERT INTO llm_usage (child_id, user_id, tokens_in, tokens_out) VALUES (?, ?, ?, ?)
    `).run(childId, userId, tokensIn || 0, tokensOut || 0);
  } catch (e) {
    console.error('[llm] recordUsage failed:', e.message);
  }
}

// ─── API key 加载 ───
function loadApiKey() {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const envPath = path.join(os.homedir(), '.config', 'grandkidsgo', 'secrets.env');
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, 'utf-8');
  const m = text.match(/^\s*MINIMAX_API_KEY\s*=\s*(.+?)\s*$/m);
  return m ? m[1].replace(/^['"]|['"]$/g, '') : null;
}

// ─── 路由 ───
router.post('/chat', authenticate, async (req, res) => {
  const { messages, systemPrompt, childId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'messages 不能为空' });
  }
  if (!childId || typeof childId !== 'string') {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'childId 必填' });
  }

  // 限流
  const rate = checkRate(childId);
  if (!rate.ok) {
    return res.status(429).json({
      code: 'RATE_LIMIT',
      message: rate.reason === 'rate_limit_minute' ? '聊得太快啦，歇一会~' : '今天聊够啦，明天再来~',
      retryAfter: rate.retryAfter
    });
  }

  const apiKey = loadApiKey();
  if (!apiKey) {
    return res.status(500).json({ code: 'NO_API_KEY', message: '服务端未配置 LLM key' });
  }

  // 注入 child 上下文（如果有 child 信息）
  const child = db.prepare(`SELECT id, nickname, age, gender FROM children WHERE id = ? AND user_id = ?`)
    .get(childId, req.user.id);

  let childContext = '';
  if (child) {
    childContext = `\n\n【用户信息】\n- 昵称：${child.nickname || '小朋友'}\n- 年龄：${child.age || '?'}\n- 性别：${child.gender === 'male' ? '男' : child.gender === 'female' ? '女' : '?'}`;
  }

  const fullSystem = (systemPrompt || '你是一个友好的 AI 朋友。') + childContext;

  // ─── SSE 流式响应 ───
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const upstream = await fetch('https://api.minimaxi.com/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'abab6.5s-chat',
        messages: [
          { role: 'system', content: fullSystem },
          ...messages.slice(-20)  // 限 20 条历史
        ],
        stream: true,
        temperature: 0.85,
        max_tokens: 200
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[llm] upstream error:', upstream.status, errText.slice(0, 200));
      res.write(`data: ${JSON.stringify({ error: 'upstream_error', status: upstream.status })}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 行解析（MiniMax 是 OpenAI 兼容：data: {...}\n\n）
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        } catch (e) {
          // skip malformed
        }
      }
    }

    res.end();
    // 记录使用
    recordUsage(childId, req.user.id, 0, 0);
    console.log(`[llm] child=${childId} resp_len=${fullText.length}`);
  } catch (e) {
    console.error('[llm] fetch failed:', e.message);
    res.write(`data: ${JSON.stringify({ error: 'fetch_failed', message: e.message })}\n\n`);
    res.end();
  }
});

// 限流状态查询
router.get('/rate-status', authenticate, (req, res) => {
  const childId = req.query.childId;
  if (!childId) return res.status(400).json({ code: 'BAD_REQUEST', message: 'childId 必填' });
  ensureTable();
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const todayStart = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').toISOString();
  const minCount = db.prepare(`SELECT count(*) as c FROM llm_usage WHERE child_id = ? AND created_at > ?`).get(childId, oneMinAgo).c;
  const dayCount = db.prepare(`SELECT count(*) as c FROM llm_usage WHERE child_id = ? AND created_at > ?`).get(childId, todayStart).c;
  res.json({
    code: 'OK',
    data: {
      perMinute: { used: minCount, limit: RATE_LIMIT_MIN },
      perDay: { used: dayCount, limit: RATE_LIMIT_DAY }
    }
  });
});

module.exports = router;