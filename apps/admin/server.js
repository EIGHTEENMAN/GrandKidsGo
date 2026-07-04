import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const app = express();
app.use(cors());
app.use(express.static('dist'));

// PM2 process status
app.get('/api/services', (req, res) => {
  try {
    const out = execSync('pm2 jlist', { encoding: 'utf8', timeout: 5000 });
    const processes = JSON.parse(out);
    res.json(processes.map(p => ({
      name: p.name,
      id: p.pm_id,
      status: p.pm2_env.status,
      uptime: p.pm2_env.pm_uptime,
      cpu: p.monit.cpu,
      memory: p.monit.memory,
      port: p.pm2_env.PORT || 'N/A',
    })));
  } catch {
    res.json([]);
  }
});

// System info
app.get('/api/system', (req, res) => {
  try {
    const disk = execSync("df -h / | tail -1 | awk '{print $3 \"/\" $2 \" (\" $5 \")\"}'", { encoding: 'utf8', timeout: 3000 }).trim();
    const mem = execSync("free -h | grep Mem | awk '{print $3 \"/\" $2}'", { encoding: 'utf8', timeout: 3000 }).trim();
    const load = execSync("uptime | awk -F'load average:' '{print $2}'", { encoding: 'utf8', timeout: 3000 }).trim();
    const node = execSync('node -v', { encoding: 'utf8', timeout: 3000 }).trim();
    res.json({ disk, memory: mem, load, node, hostname: '47.114.77.124' });
  } catch {
    res.json({});
  }
});

// Travel-guide DB stats
app.get('/api/stats', (req, res) => {
  try {
    const env = readFileSync('/grandkidsgo/apps/travel-guide/.env', 'utf8');
    const line = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
    if (!line) return res.json({});
    const dbUrl = line.substring('DATABASE_URL='.length).replace(/\?schema=.*$/, '');

    const run = (sql) => {
      try {
        const cmd = `psql "${dbUrl}" -t -c "${sql}"`;
        const out = execSync(cmd, { encoding: 'utf8', timeout: 5000 });
        return parseInt(out.trim()) || 0;
      } catch { return 0; }
    };

    res.json({
      users: run('SELECT COUNT(*) FROM users'),
      guides: run("SELECT COUNT(*) FROM guides WHERE is_publish = true"),
      sections: run('SELECT COUNT(*) FROM guide_sections'),
      ratings: run('SELECT COUNT(*) FROM ratings'),
      comments: run('SELECT COUNT(*) FROM comments'),
      likes: run('SELECT COUNT(*) FROM likes'),
      favorites: run('SELECT COUNT(*) FROM favorites'),
    });
  } catch {
    res.json({});
  }
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// SPA fallback
app.get('*', (req, res) => {
  try {
    const html = readFileSync('dist/index.html', 'utf8');
    res.send(html);
  } catch {
    res.status(404).send('Admin site not built');
  }
});

const PORT = process.env.PORT || 3099;
app.listen(PORT, () => console.log('Admin API running on port ' + PORT));
