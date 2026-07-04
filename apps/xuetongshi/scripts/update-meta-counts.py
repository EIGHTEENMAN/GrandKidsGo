#!/usr/bin/env python3
"""
根据 knowledge.ts 的实际 sections 数量更新 knowledge-meta.ts 的 sectionCount
"""
import re
import subprocess
import sys

def count_sections(text, topic_id):
    """计算 topic 实际 sections 数量"""
    marker = f"id: '{topic_id}',"
    idx = text.find(marker)
    if idx < 0:
        return None
    sec_pos = text.find('sections: [', idx)
    if sec_pos < 0:
        return None
    sec_start = sec_pos + len('sections: [')
    depth = 1
    i = sec_start
    in_str = False
    sc = None
    while i < len(text) and depth > 0:
        c = text[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == sc:
                in_str = False
            i += 1
            continue
        if c in '"\'`':
            in_str = True
            sc = c
            i += 1
            continue
        if c == '[':
            depth += 1
        elif c == ']':
            depth -= 1
        i += 1
    sec_end = i - 1
    body = text[sec_start:sec_end]
    # 数 {id: '...'} 对象个数（顶层）
    cnt = 0
    d = 0
    in_s = False
    scc = None
    for k, c in enumerate(body):
        if in_s:
            if c == '\\':
                continue
            if c == scc:
                in_s = False
            continue
        if c in '"\'`':
            in_s = True
            scc = c
            continue
        if c == '{' and d == 0:
            cnt += 1
        if c == '{':
            d += 1
        elif c == '}':
            d -= 1
    return cnt

def main():
    with open('src/data/knowledge.ts', 'r', encoding='utf-8') as f:
        data = f.read()
    with open('src/data/knowledge-meta.ts', 'r', encoding='utf-8') as f:
        meta = f.read()

    # 找所有 topic id
    topic_re = re.compile(r"id:\s*'([^']+)',\s*title:")
    topic_ids = []
    for m in topic_re.finditer(data):
        topic_ids.append(m.group(1))

    updated = 0
    for tid in topic_ids:
        cnt = count_sections(data, tid)
        if cnt is None:
            continue
        # meta 是 JSON 格式 "id": "xxx", ... "sectionCount": N
        meta_re = re.compile(
            r'("id":\s*"' + re.escape(tid) + r'",[\s\S]*?"sectionCount":\s*)\d+'
        )
        new_meta, n = meta_re.subn(r"\g<1>" + str(cnt), meta, count=1)
        if n > 0:
            meta = new_meta
            updated += 1

    with open('src/data/knowledge-meta.ts', 'w', encoding='utf-8') as f:
        f.write(meta)

    print(f"✅ 更新 {updated} 个 topic 的 sectionCount")

if __name__ == '__main__':
    main()
