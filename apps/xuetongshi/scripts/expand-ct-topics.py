#!/usr/bin/env python3
"""
学通识 ct-* topic 批量扩充 - 追加 sections

用法:
  python3 expand-ct-topics.py <topic_id> <expanded_sections_file> [--replace]

默认追加（在原 sections 数组末尾插入新节），--replace 替换整个 sections 数组
"""
import sys

if len(sys.argv) < 3:
    print("用法: python3 expand-ct-topics.py <topic_id> <expanded_sections_file> [--replace]")
    sys.exit(1)

topic_id = sys.argv[1]
expanded_file = sys.argv[2]
replace_mode = len(sys.argv) > 3 and sys.argv[3] == '--replace'

with open('src/data/knowledge.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 找到 topic
topic_marker = "id: '%s'," % topic_id
idx = text.find(topic_marker)
if idx < 0:
    print(f"ERROR: 找不到 topic {topic_id}")
    sys.exit(1)

# 找 sections: [
sections_pos = text.find("sections: [", idx)
sections_start = sections_pos + len("sections: [")

# 找匹配的 ]
depth = 1
i = sections_start
in_str = False
str_char = None
while i < len(text) and depth > 0:
    c = text[i]
    if in_str:
        if c == '\\':
            i += 2
            continue
        if c == str_char:
            in_str = False
        i += 1
        continue
    if c == '"' or c == "'" or c == '`':
        in_str = True
        str_char = c
        i += 1
        continue
    if c == '[':
        depth += 1
    elif c == ']':
        depth -= 1
    i += 1

sections_end = i - 1  # ']' 位置

# 读 expanded
with open(expanded_file, 'r', encoding='utf-8') as f:
    expanded = f.read().rstrip()

if replace_mode:
    if not expanded.startswith('['):
        if expanded.startswith('{'):
            expanded = '[\n' + expanded + '\n    ]'
        else:
            expanded = '[\n      ' + expanded + '\n    ]'
    new_text = text[:sections_start] + expanded + text[sections_end+1:]
    mode_label = "替换"
else:
    # 追加模式：在 sections 数组的 ] 前插入 expanded
    # sections_start 之后是原 sections 内容，sections_end 是 ]
    # 在 ] 前插入 "\n" + expanded + ","
    # expanded 已经是 "  {\n    id: ...\n  }," 格式
    insertion = "\n" + expanded + ("," if not expanded.rstrip().endswith(",") else "")
    new_text = text[:sections_end] + insertion + text[sections_end:]
    mode_label = "追加"

with open('src/data/knowledge.ts', 'w', encoding='utf-8') as f:
    f.write(new_text)

cnt = expanded.count("id: '" + topic_id + "-s")
print(f"✅ {topic_id}: {mode_label} {cnt} 节")
