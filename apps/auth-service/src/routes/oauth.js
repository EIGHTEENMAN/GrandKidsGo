const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateTokens } = require('../utils/jwt');
const config = require('../config');

const router = express.Router();

// POST /api/oauth/wechat - WeChat mini-program login
router.post('/wechat', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '微信登录 code 不能为空' });
  }

  try {
    // Exchange code for session_key + openid
    const resp = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${config.wechat.appId}&secret=${config.wechat.appSecret}&js_code=${code}&grant_type=authorization_code`
    );
    const data = await resp.json();

    if (data.errcode) {
      console.error('[WeChat OAuth Error]', data);
      return res.status(400).json({ code: 'WECHAT_AUTH_FAILED', message: '微信登录失败' });
    }

    const { openid, session_key } = data;

    // Find or create user
    let user = db.prepare(`SELECT * FROM users WHERE wechat_openid = ?`).get(openid);

    if (!user) {
      const id = uuidv4();
      db.prepare(
        `INSERT INTO users (id, wechat_openid, nickname, username) VALUES (?, ?, ?, ?)`
      ).run(id, openid, `wx_${openid.substring(0, 8)}`, `wx_${openid.substring(0, 8)}`);
      db.prepare(`INSERT INTO points (user_id, balance, total_earned) VALUES (?, 0, 0)`).run(id);
      user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
    }

    const tokens = generateTokens(user);

    res.json({
      code: 'OK',
      data: {
        user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar },
        ...tokens,
      },
    });
  } catch (err) {
    console.error('[WeChat OAuth Error]', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: '微信登录请求失败' });
  }
});

module.exports = router;
