#!/usr/bin/env python3
"""最后一轮批量扩充所有剩余书籍"""
import re, os

def do_expand(text, bid, new_sections_text):
    """替换指定书籍的sections"""
    book_m = re.search(r"id: '" + bid + r"', title: '([^']+)'", text)
    if not book_m:
        print(f"  {bid}: 未找到"); return text, 0
    sec_pos = text.find("sections: [", book_m.start())
    sec_start = sec_pos + len("sections: [")
    next_m = re.search(r"\{ id: '(?:jing|zi|shi|yi|meng)-\d+'", text[book_m.start()+1:])
    next_pos = book_m.start() + 1 + next_m.start() if next_m else len(text)
    area = text[sec_start:next_pos]
    close_pos = area.rfind("    ] },")
    if close_pos < 0:
        print(f"  {bid}: 闭合标记未找到"); return text, 0
    repl_end = sec_start + close_pos
    text = text[:sec_start] + '\n' + new_sections_text.strip() + '\n' + text[repl_end:]
    cnt = len(re.findall(r"id: '" + bid + r"-s\d+'", text))
    return text, cnt

with open('src/data/classics.ts', 'r') as f:
    text = f.read()

# 批量处理：从已存在的文件替换
processed = 0
for prefix in ['shi', 'yi', 'zi']:
    for num in range(1, 32):
        fn = f'tmp/{prefix}{num}.txt'
        # Skip non-existent files
        import glob
        all_files = {f.replace('tmp/', '').replace('.txt', '') for f in glob.glob('tmp/*.txt')
                    if os.path.exists(f)}

# Just do the ones that have files
import glob
for fpath in sorted(glob.glob('tmp/*.txt')):
    fname = os.path.basename(fpath).replace('.txt', '')
    # Map filename to book id
    prefix = fname[:2]  # sh, yi, zi
    num = fname[2:]
    # Fix prefix mapping
    if fname.startswith('sh'):
        bid = 'shi-' + fname[3:]
    elif fname.startswith('yi'):
        bid = 'yi-' + fname[2:]
    elif fname.startswith('zi'):
        bid = 'zi-' + fname[2:]
    else:
        continue

    # Check if this book already has >10 sections
    cur = len(re.findall(r"id: '" + bid + r"-s\d+", text))
    if cur > 10:
        continue

    with open(fpath, 'r') as f:
        new_sec = f.read()
    if not new_sec.strip():
        continue

    text, cnt = do_expand(text, bid, new_sec)
    if cnt > 0 and cnt != cur:
        print(f"✅ {bid}: {cur}->{cnt}节")
        processed += 1

print(f"\n共处理 {processed} 本")
print(f"Brace: {text.count('{')-text.count('}')}")

with open('src/data/classics.ts', 'w') as f:
    f.write(text)
