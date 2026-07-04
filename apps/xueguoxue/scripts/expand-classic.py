#!/usr/bin/env python3
"""通用经典书籍扩充工具：替换 sections 数组"""
import sys, re

if len(sys.argv) < 4:
    print("用法: python3 expand-classic.py <book_id> <id_prefix> <expanded_content_file>")
    print("示例: python3 expand-classic.py jing-3 jing-3-s /tmp/mid.txt")
    sys.exit(1)

book_id = sys.argv[1]  # e.g. 'jing-3'
id_prefix = sys.argv[2]  # e.g. 'jing-3-s'
expanded_file = sys.argv[3]

with open('src/data/classics.ts', 'r') as f:
    text = f.read()

# Find the book
book_marker = "id: '%s'," % book_id
idx = text.find(book_marker)
sections_pos = text.find("sections: [", idx)
sections_start = sections_pos + len("sections: [")

# Find the next book (to determine end boundary)
# Look for any book ID after this one
next_books = re.findall(r"\{ id: '(?:jing|zi|shi|yi|meng)-\d+',", text[idx+1:])
if next_books:
    next_marker = next_books[0]
    next_idx = text.find(next_marker, idx)
else:
    next_idx = len(text)

# The area between sections_start and before next book
# Find the closing pattern: last }  followed by "    ] },"
# We want REPLACEMENT_END at the start of "    ] }," so expanded content's trailing
# `},` plus the close pattern doesn't double up
search_area = text[idx:next_idx]
# Find the last `    ] },` (the sections array close + book close, not the section close)
close_pattern = "    ] },"
close_idx = search_area.rfind(close_pattern)

if close_idx < 0:
    # Try alternative patterns
    for p in [",\n    ],", "],    } }", "    ],\n    },", "    ] },"]:
        ci = search_area.rfind(p)
        if ci >= 0:
            close_idx = ci
            break

if close_idx < 0:
    print("ERROR: Could not find closing pattern")
    print("Last 150 chars:", repr(search_area[-150:]))
    sys.exit(1)

# replacement_end = absolute position of the close_pattern start
replacement_end = idx + close_idx

with open(expanded_file, 'r') as f:
    expanded = f.read()

new_text = text[:sections_start] + expanded + text[replacement_end:]

with open('src/data/classics.ts', 'w') as f:
    f.write(new_text)

# Verify
new_count = len(re.findall(r"id: '%s\d+'" % id_prefix, new_text))
print("✅ %s 已扩充到 %d 节" % (book_id, new_count))

# Check bracket balance
opens = new_text.count('{')
closes = new_text.count('}')
ob = new_text.count('[')
cb = new_text.count(']')
if opens == closes and ob == cb:
    print("   括号匹配: 正确")
else:
    print("   括号匹配: 警告! {:d}:{:d} [{:d}:{:d}".format(opens, closes, ob, cb))
