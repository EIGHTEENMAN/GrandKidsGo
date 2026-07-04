const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const oauthRoutes = require('./routes/oauth');
const searchRoutes = require('./routes/search');
const llmRoutes = require('./routes/llm');

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/llm', llmRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: '服务器内部错误' });
});

app.listen(config.port, () => {
  console.log(`[auth-service] running on port ${config.port}`);
});
