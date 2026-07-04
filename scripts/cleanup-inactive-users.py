#!/usr/bin/env python3
"""
清理长期不活跃用户 + 过期验证码
策略：
- 2 年未登录的用户标记为 suspended + 清理 session
- 30 天以上的验证码自动清理
每月 1 号 04:00 执行
"""
import sqlite3, os, json, time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "apps" / "auth-service" / "data" / "auth.db"
LOG_FILE = Path(__file__).parent.parent / "backup" / "db" / "cleanup.log"
NOW = time.strftime("%Y-%m-%d %H:%M:%S")

if not DB_PATH.exists():
    print(f"[{NOW}] auth.db not found: {DB_PATH}")
    exit(1)

conn = sqlite3.connect(str(DB_PATH))
c = conn.cursor()

# 1. 标记 2 年不活跃用户
two_years_ago = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time() - 730 * 86400))
stale = c.execute(
    "SELECT id, username, nickname FROM users WHERE updated_at < ? AND suspended = 0",
    (two_years_ago,)
).fetchall()

if stale:
    ids = [row[0] for row in stale]
    placeholders = ",".join("?" * len(ids))
    c.execute(f"UPDATE users SET suspended = 1, updated_at = datetime('now') WHERE id IN ({placeholders})", ids)
    c.execute(f"DELETE FROM sessions WHERE user_id IN ({placeholders})", ids)
    print(f"[{NOW}] suspended {len(stale)} stale users: {[r[1] or r[0] for r in stale[:5]]}...")
else:
    print(f"[{NOW}] no stale users found")

# 2. 清理过期验证码
del_codes = c.execute("DELETE FROM verification_codes WHERE created_at < datetime('now', '-30 days')").rowcount
print(f"[{NOW}] cleaned {del_codes} expired codes")

conn.commit()
conn.close()

# 3. 写日志
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
old_logs = ""
if LOG_FILE.exists():
    old_logs = "".join(LOG_FILE.read_text(errors="replace").splitlines(keepends=True)[:99])
LOG_FILE.write_text(f"[{NOW}] stale={len(stale)} codes_clean={del_codes}\n" + old_logs)

print("done")
