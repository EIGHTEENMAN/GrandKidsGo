#!/usr/bin/env python3
"""批量替换子部书籍的sections"""
import re, os, sys

with open('src/data/classics.ts', 'r') as f:
    text = f.read()

# 所有子部规划
plan = {
    # 长书 (20-25节)
    'zi-1': 25,   # 世说新语选
    'zi-2': 20,   # 道德经
    'zi-3': 22,   # 庄子
    'zi-4': 18,   # 列子
    'zi-5': 22,   # 墨子
    'zi-6': 22,   # 荀子
    'zi-7': 22,   # 韩非子
    'zi-8': 20,   # 孙子兵法
    'zi-9': 18,   # 鬼谷子
    'zi-10': 22,  # 管子
    'zi-11': 18,  # 商君书
    'zi-12': 22,  # 吕氏春秋
    'zi-13': 22,  # 淮南子
    'zi-14': 20,  # 颜氏家训
    # 中书 (15-18节)
    'zi-15': 15,  # 菜根谭
    'zi-16': 15,  # 小窗幽记
    'zi-17': 15,  # 人物志
    'zi-18': 15,  # 申鉴
    'zi-19': 15,  # 法言
    'zi-20': 18,  # 新序
    'zi-21': 18,  # 说苑
    'zi-22': 20,  # 论衡
    'zi-23': 18,  # 抱朴子
    'zi-24': 18,  # 长短经
    'zi-25': 15,  # 忍经
    'zi-26': 18,  # 郁离子
    'zi-27': 15,  # 省心录
    'zi-28': 15,  # 樵谈
    # 复本 (10-12节)
    'zi-29': 12,  # 墨子
    'zi-30': 12,  # 韩非子
    'zi-31': 12,  # 荀子
}

def do_replace(bid, content):
    global text
    book_m = re.search(r"id: '" + bid + r"', title: '([^']+)'", text)
    if not book_m:
        print(f"  {bid}: 未找到", file=sys.stderr)
        return False

    sec_pos = text.find("sections: [", book_m.start())
    if sec_pos < 0:
        print(f"  {bid}: 未找到sections", file=sys.stderr)
        return False
    sec_start = sec_pos + len("sections: [")

    next_m = re.search(r"\{ id: '(?:jing|zi|shi|yi|meng)-\d+'", text[book_m.start()+1:])
    next_pos = book_m.start() + 1 + next_m.start() if next_m else len(text)

    area = text[sec_start:next_pos]
    close_pos = area.rfind("    ] },")
    if close_pos < 0:
        print(f"  {bid}: 未找到闭合标记", file=sys.stderr)
        return False
    repl_end = sec_start + close_pos

    text = text[:sec_start] + '\n' + content.strip() + '\n' + text[repl_end:]

    cnt = len(re.findall(r"id: '" + bid + r"-s\d+'", text))
    expected = plan[bid]
    status = "✅" if cnt == expected else f"⚠️预期{expected}"
    print(f"  {status} {bid}: {cnt}节", file=sys.stderr)
    return True

if __name__ == '__main__':
    # 从文件读取内容并替换
    for bid, expected in plan.items():
        num = bid.split('-')[1]
        content_file = f'tmp/zi{num}.txt'
        if not os.path.exists(content_file):
            content_file = f'/tmp/zi{num}.txt'
        if not os.path.exists(content_file):
            continue

        with open(content_file, 'r') as f:
            content = f.read()
        do_replace(bid, content)

    with open('src/data/classics.ts', 'w') as f:
        f.write(text)

    bal = text.count('{') - text.count('}')
    print(f"括号平衡: {bal}", file=sys.stderr)
