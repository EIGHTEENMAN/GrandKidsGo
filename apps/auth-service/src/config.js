const IS_PROD = process.env.NODE_ENV === 'production';

const config = {
  port: parseInt(process.env.PORT || '3007', 10),
  jwt: {
    // 生产环境必须通过 JWT_SECRET 环境变量配置；dev 保留 fallback 便于本地联调
    secret: process.env.JWT_SECRET || (IS_PROD ? null : 'grandkidsgo-jwt-secret-dev'),
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  sms: {
    // ECS 实例 RAM 角色方案 — SDK 自动获取临时凭证，不配任何密钥
    // 阿里云控制台操作：创建 RAM 角色 → 绑定到 ECS 实例
    regionId: process.env.SMS_REGION_ID || 'cn-hangzhou',
    signName: process.env.SMS_SIGN_NAME || '童慧行',
    templateCode: process.env.SMS_TEMPLATE_CODE || '',
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  },
  db: {
    path: process.env.DB_PATH || './data/auth.db',
  },
  cors: {
    // 未配置 CORS_ORIGIN 时用白名单函数：grandand.com 及子域放行；
    // 生产环境非白名单 origin 拒绝（fail-closed），dev 才放行便于本地联调
    origin: process.env.CORS_ORIGIN || function (origin, callback) {
      if (!origin) return callback(null, true); // 非浏览器请求（curl/server-side）
      if (origin === 'https://grandand.com' || /^https:\/\/[a-z0-9-]+\.grandand\.com$/.test(origin)) {
        callback(null, true);
      } else if (IS_PROD) {
        callback(new Error(`CORS blocked: ${origin}`));
      } else {
        callback(null, true); // dev 放行
      }
    },
  },
  cookieDomain: process.env.COOKIE_DOMAIN || (IS_PROD ? '.grandand.com' : ''),
};

// 生产环境必须配置 JWT_SECRET，启动即失败（不静默 fallback 到公开 dev secret）
if (IS_PROD && !config.jwt.secret) {
  throw new Error('生产环境必须配置 JWT_SECRET 环境变量，拒绝以 dev secret 启动');
}

module.exports = config;
