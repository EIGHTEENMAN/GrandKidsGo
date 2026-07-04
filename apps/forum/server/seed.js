// Forum seed data - run with: node server/seed.js
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const postCount = db.prepare('SELECT COUNT(*) as cnt FROM posts').get().cnt;
if (postCount > 0) {
  console.log(`[seed] forum already has ${postCount} posts, skipping`);
  process.exit(0);
}

console.log('[seed] creating sample data...');

// Create a test user
const userId = 'seed-user-001';
db.prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)').run(userId, '小太阳妈妈');

const posts = [
  { boardId: 'parenting', title: '孩子三岁了还不会自己吃饭怎么办？', content: '我家宝宝三岁了，还是不太会自己用勺子吃饭，每次都要追着喂。请问各位宝妈有什么好的方法可以培养孩子独立进食的习惯吗？', username: '小太阳妈妈' },
  { boardId: 'parenting', title: '分享一个超级好用的亲子阅读APP', content: '最近发现了一个特别好用的亲子阅读APP，里面的绘本都是中英双语的，还有互动功能，孩子特别喜欢。推荐给大家！', username: '书香妈妈' },
  { boardId: 'parenting', title: '周末带孩子去公园野餐的感想', content: '上周末天气特别好，带孩子去了附近的公园野餐。看着孩子在草地上奔跑，感觉所有的辛苦都值得了。分享一下我们的野餐清单和注意事项。', username: '幸福一家人' },
  { boardId: 'education', title: '幼小衔接到底要不要上？', content: '孩子明年就要上小学了，周围好多家长都在报幼小衔接班。我很纠结，一方面怕孩子输在起跑线上，另一方面又不想给孩子太大压力。', username: '焦虑的妈妈' },
  { boardId: 'education', title: '推荐几本适合3-6岁的数学启蒙绘本', content: '数学启蒙不一定要刷题，好的绘本同样能培养数学思维。给大家推荐几本我们家用下来效果不错的数学启蒙绘本。', username: '数学老师' },
  { boardId: 'education', title: '孩子学英语几岁开始比较好？', content: '有人说越早越好，有人说太早会影响母语发展。想听听大家的实际经验，孩子几岁开始学英语比较合适？', username: '英语小白' },
  { boardId: 'travel', title: '带娃去迪士尼的完全攻略', content: '刚从上海迪士尼回来，整理了一份带娃游迪士尼的详细攻略，从门票购买到项目推荐，希望能帮到准备带孩子去的家长们。', username: '旅行达人' },
  { boardId: 'travel', title: '暑假亲子游推荐：云南大理', content: '云南大理真的是亲子游的绝佳选择！气候宜人，风景优美，而且有很多适合孩子的活动。分享一下我们的行程安排。', username: '背包客妈妈' },
  { boardId: 'travel', title: '带小宝宝坐飞机的注意事项', content: '第一次带孩子坐飞机，做了很多功课。分享一下婴儿乘机的注意事项和必备物品清单。', username: '飞行妈妈' },
  { boardId: 'fun', title: '孩子画的一幅画把我感动哭了', content: '今天下班回家，孩子递给我一幅画，上面画着我们一家三口手牵手。虽然画得歪歪扭扭的，但那一刻真的感动到不行。', username: '感性爸爸' },
  { boardId: 'fun', title: '用乐高搭了一个故宫太和殿', content: '花了整整一周时间，和孩子一起用乐高搭了一个故宫太和殿。虽然没有那么精致，但孩子学到了很多关于古建筑的知识。', username: '乐高迷' },
  { boardId: 'fun', title: '孩子讲的一个笑话把我笑翻了', content: '今天孩子从幼儿园回来，一本正经地跟我说：妈妈你知道为什么鱼不能打篮球吗？因为它们在水中投不了篮！哈哈哈这冷笑话跟谁学的。', username: '开心妈妈' },
  { boardId: 'feedback', title: '建议增加家长交流区的分类', content: '现在家长交流区的帖子比较杂，建议可以增加一些子分类，比如按年龄段、按话题等，方便查找相关内容。', username: '热心用户' },
  { boardId: 'feedback', title: '网站加载速度有点慢', content: '最近访问网站感觉加载速度比以前慢了，特别是在晚上高峰时期。不知道是服务器的问题还是我的网络问题。', username: '追风少年' },
  { boardId: 'feedback', title: '希望能增加手机端的APP', content: '现在用手机浏览器访问体验还不错，但还是希望官方能出一个手机APP，用起来会更方便。', username: '手机党' },
];

// Create seed users
const usernames = ['书香妈妈', '幸福一家人', '焦虑的妈妈', '数学老师', '英语小白', '旅行达人', '背包客妈妈', '飞行妈妈', '感性爸爸', '乐高迷', '开心妈妈', '热心用户', '追风少年', '手机党'];
for (const u of usernames) {
  db.prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)').run(uuidv4(), u);
}

// Insert posts and record IDs for comments
const postIds = [];
const insertPost = db.prepare(
  "INSERT INTO posts (id, board_id, user_id, title, content, created_at, view_count, like_count, comment_count) VALUES (?, ?, ?, ?, ?, datetime('now', ?), ?, ?, ?)"
);

// Add varying timestamps so posts span a few days
const timeOffsets = [
  '-1 hours', '-2 hours', '-3 hours', '-5 hours', '-8 hours', '-12 hours',
  '-1 days', '-1 days +2 hours', '-1 days +6 hours', '-2 days', '-2 days +4 hours',
  '-3 days', '-4 days', '-5 days', '-7 days',
];

db.transaction(() => {
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const pid = uuidv4();
    const user = db.prepare("SELECT id FROM users WHERE username = ?").get(p.username) || { id: userId };
    insertPost.run(pid, p.boardId, user.id, p.title, p.content, timeOffsets[i] || '-1 hours', Math.floor(Math.random() * 200 + 10), Math.floor(Math.random() * 30), 0);
    postIds.push(pid);
  }
})();

console.log(`[seed] created ${posts.length} posts`);

// Add comments
const commentTexts = [
  ['感谢分享！非常实用。', '请问能再说详细一点吗？', '深有同感！'],
  ['写得真好，收藏了。', '同意楼主的观点。', '我来补充一下...'],
  ['我家也是这种情况！', '学到了，谢谢！', '有没有其他推荐？'],
  ['这个方法我们也试过，有效！', '不太同意，我觉得应该...', '因人而异吧。'],
];

let commentCount = 0;
db.transaction(() => {
  for (let i = 0; i < postIds.length && i < 12; i++) {
    const pid = postIds[i];
    const user = db.prepare("SELECT id FROM users WHERE username != '小太阳妈妈' ORDER BY RANDOM() LIMIT 1").get();
    if (!user) continue;
    const texts = commentTexts[i % commentTexts.length];
    for (const text of texts) {
      const cid = uuidv4();
      db.prepare("INSERT INTO comments (id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))")
        .run(cid, pid, user.id, text, `-${Math.floor(Math.random() * 12)} hours`);
      db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').run(pid);
      commentCount++;
    }
  }
})();

console.log(`[seed] created ${commentCount} comments`);

// Add some likes
let likeCount = 0;
db.transaction(() => {
  for (const pid of postIds.slice(0, 10)) {
    const users = db.prepare("SELECT id FROM users ORDER BY RANDOM() LIMIT 3").all();
    for (const u of users) {
      db.prepare("INSERT OR IGNORE INTO likes (target_type, target_id, user_id) VALUES ('post', ?, ?)").run(pid, u.id);
      db.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id = ?').run(pid);
      likeCount++;
    }
  }
})();

console.log(`[seed] created ${likeCount} likes`);

// Update hot scores
db.exec(`
  UPDATE posts SET hot_score = (
    (like_count * 3.0 + comment_count * 2.0) /
    (julianday('now') - julianday(created_at) + 1.0)
  );
`);

console.log('[seed] done!');
