import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'game.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    elo_rating INTEGER DEFAULT 1000,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quiz_matches (
    id TEXT PRIMARY KEY,
    room_code TEXT,
    player1_id TEXT,
    player2_id TEXT,
    winner_id TEXT,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    questions_count INTEGER DEFAULT 5,
    status TEXT DEFAULT 'waiting',
    created_at TEXT DEFAULT (datetime('now')),
    finished_at TEXT
  );

  CREATE TABLE IF NOT EXISTS quiz_rooms (
    code TEXT PRIMARY KEY,
    host_id TEXT NOT NULL,
    subjects TEXT DEFAULT '',
    difficulty INTEGER DEFAULT 1,
    team_size INTEGER DEFAULT 1,
    status TEXT DEFAULT 'waiting',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT DEFAULT 'general',
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    answer INTEGER NOT NULL,
    difficulty INTEGER DEFAULT 1,
    section_ref TEXT DEFAULT ''
  );

  DROP TABLE IF EXISTS solo_scores;
  CREATE TABLE IF NOT EXISTS solo_scores (
    user_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'mixed',
    username TEXT NOT NULL,
    total_questions INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, category)
  );
`);

// Migrate: add section_ref column if it doesn't exist
try {
  db.exec('ALTER TABLE quiz_questions ADD COLUMN section_ref TEXT DEFAULT \'\'');
} catch { /* column already exists */ }

const insertQuestion = db.prepare(
  `INSERT INTO quiz_questions (category, question, options, answer, difficulty, section_ref) VALUES (?, ?, ?, ?, ?, ?)`
);

const countQuestions = db.prepare(`SELECT COUNT(*) as cnt FROM quiz_questions`).get();
if (countQuestions.cnt === 0) {
  const questions = [
    ['chinese', '「床前明月光」的下一句是？', JSON.stringify(['低头思故乡', '疑是地上霜', '举头望明月', '处处闻啼鸟']), 0, 1],
    ['chinese', '「锄禾日当午」描写的是什么季节？', JSON.stringify(['春天', '夏天', '秋天', '冬天']), 1, 1],
    ['chinese', '「春眠不觉晓」的作者是？', JSON.stringify(['李白', '杜甫', '孟浩然', '白居易']), 2, 1],
    ['chinese', '「欲穷千里目，更上一层楼」出自哪首诗？', JSON.stringify(['登高', '登鹳雀楼', '望岳', '凉州词']), 1, 1],
    ['chinese', '「海内存知己，天涯若比邻」的作者是？', JSON.stringify(['王勃', '王维', '王昌龄', '王之涣']), 0, 2],
    ['chinese', '「不识庐山真面目」的下一句是？', JSON.stringify(['只在此山中', '只缘身在此山中', '远近高低各不同', '横看成岭侧成峰']), 1, 1],
    ['chinese', '「但愿人长久，千里共婵娟」是谁写的？', JSON.stringify(['苏辙', '苏轼', '苏洵', '苏小妹']), 1, 1],
    ['chinese', '「落红不是无情物，化作春泥更护花」出自哪个朝代？', JSON.stringify(['唐', '宋', '元', '清']), 3, 2],
    ['chinese', '"少壮不努力"的下一句是？', JSON.stringify(['老大徒伤悲', '老来空悲切', '白发悲花落', '青春不再来']), 0, 1],
    ['chinese', '「静夜思」中"举头望明月"的下一句是？', JSON.stringify(['低头思故乡', '疑是地上霜', '月是故乡明', '对影成三人']), 0, 1],
    ['chinese', '「白日依山尽」中"依"是什么意思？', JSON.stringify(['依靠', '依照', '挨着', '顺从']), 2, 2],
    ['chinese', '「两岸猿声啼不住，轻舟已过万重山」出自？', JSON.stringify(['早发白帝城', '望庐山瀑布', '赠汪伦', '黄鹤楼送孟浩然之广陵']), 0, 2],
    ['chinese', '「野火烧不尽」的下一句是？', JSON.stringify(['春风吹又生', '春来发几枝', '春风又绿江南岸', '春江水暖鸭先知']), 0, 1],
    ['science', '地球绕太阳转一圈需要多长时间？', JSON.stringify(['一天', '一个月', '一年', '一小时']), 2, 1],
    ['science', '水在什么温度下会结冰？', JSON.stringify(['0°C', '10°C', '-10°C', '100°C']), 0, 1],
    ['science', '人体最大的器官是什么？', JSON.stringify(['心脏', '肝脏', '皮肤', '大脑']), 2, 2],
    ['science', '光在真空中传播的速度大约是？', JSON.stringify(['3万公里/秒', '30万公里/秒', '300万公里/秒', '30公里/秒']), 1, 2],
    ['science', '以下哪个是恐龙灭绝的主流假说？', JSON.stringify(['火山爆发', '小行星撞击', '气候变化', '疾病流行']), 1, 2],
    ['science', '植物通过什么过程制造食物？', JSON.stringify(['呼吸作用', '光合作用', '蒸腾作用', '发酵作用']), 1, 1],
    ['science', '地球有多少颗天然卫星？', JSON.stringify(['0', '1', '2', '3']), 1, 1],
    ['science', '人体有多少块骨骼（成年人）？', JSON.stringify(['106', '206', '306', '406']), 1, 2],
    ['science', '水的化学式是？', JSON.stringify(['H2O', 'CO2', 'NaCl', 'O2']), 0, 1],
    ['english', '「苹果」的英文是？', JSON.stringify(['Banana', 'Apple', 'Orange', 'Grape']), 1, 1],
    ['english', '「星星」的英文是？', JSON.stringify(['Moon', 'Cloud', 'Star', 'Sky']), 2, 1],
    ['english', '「幸福」的英文是？', JSON.stringify(['Sad', 'Happy', 'Angry', 'Tired']), 1, 1],
    ['english', '「医生」的英文是？', JSON.stringify(['Teacher', 'Doctor', 'Driver', 'Cook']), 1, 1],
    ['english', '「猫」的英文是？', JSON.stringify(['Dog', 'Cat', 'Bird', 'Fish']), 1, 1],
    ['english', '「蓝色」的英文是？', JSON.stringify(['Red', 'Green', 'Blue', 'Yellow']), 2, 1],
    ['english', '「星期一」的英文是？', JSON.stringify(['Sunday', 'Monday', 'Tuesday', 'Wednesday']), 1, 2],
    ['english', 'Which is a fruit?', JSON.stringify(['Potato', 'Carrot', 'Apple', 'Bread']), 2, 2],
    ['english', '「谢谢」的英文是？', JSON.stringify(['Sorry', 'Please', 'Thank you', 'Hello']), 2, 1],
    ['general', '中国的首都是？', JSON.stringify(['上海', '广州', '北京', '深圳']), 2, 1],
    ['general', '一年有多少个月？', JSON.stringify(['10', '11', '12', '13']), 2, 1],
    ['general', '世界上最高的山峰是？', JSON.stringify(['泰山', '富士山', '珠穆朗玛峰', '黄山']), 2, 1],
    ['general', '一周有几天？', JSON.stringify(['5', '6', '7', '8']), 2, 1],
    ['general', '彩虹有几种颜色？', JSON.stringify(['5', '6', '7', '8']), 2, 2],
    ['general', '中国有多少个省级行政区？', JSON.stringify(['23', '28', '34', '56']), 2, 2],
    ['general', '太阳从哪边升起？', JSON.stringify(['南边', '北边', '东边', '西边']), 2, 1],
    ['general', '中国的母亲河是什么河？', JSON.stringify(['长江', '黄河', '珠江', '淮河']), 1, 1],
    ['general', '端午节是为了纪念谁？', JSON.stringify(['李白', '屈原', '孔子', '诸葛亮']), 1, 2],
    ['general', '奥运会的标志是几个环？', JSON.stringify(['4', '5', '6', '7']), 1, 2],
    ['math', '3 + 5 = ?', JSON.stringify(['6', '7', '8', '9']), 2, 1],
    ['math', '10 - 3 = ?', JSON.stringify(['5', '6', '7', '8']), 2, 1],
    ['math', '4 × 5 = ?', JSON.stringify(['15', '20', '25', '30']), 1, 1],
    ['math', '12 ÷ 3 = ?', JSON.stringify(['3', '4', '6', '2']), 1, 1],
    ['math', '15 + 6 = ?', JSON.stringify(['19', '20', '21', '22']), 2, 1],
    ['math', '25 - 7 = ?', JSON.stringify(['16', '17', '18', '19']), 2, 1],
    ['math', '9 × 9 = ?', JSON.stringify(['72', '81', '90', '99']), 1, 2],
    ['math', '100 ÷ 4 = ?', JSON.stringify(['20', '25', '30', '40']), 1, 2],
    ['math', '一个直角三角形的两个锐角之和是？', JSON.stringify(['45°', '90°', '180°', '360°']), 1, 3],
    ['math', '圆的周长公式是？', JSON.stringify(['2πr', 'πr', 'πr²', '2πr²']), 0, 3],
  ];
  // Add empty section_ref to all fallback questions
  const fallbackQs = questions.map(q => [...q, '']);
  const insertMany = db.transaction((qs) => {
    for (const q of qs) insertQuestion.run(...q);
  });
  insertMany(fallbackQs);
}

export default db;
