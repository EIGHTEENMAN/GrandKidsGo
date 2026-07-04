#!/usr/bin/env python3
"""三字经 齐读：单次生成 + ffmpeg变调实现多人效果，100%同步"""
import subprocess, os, json, sys

text = ("人之初，性本善。性相近，习相远。苟不教，性乃迁。教之道，贵以专。\n"
        "昔孟母，择邻处。子不学，断机杼。窦燕山，有义方。教五子，名俱扬。\n"
        "养不教，父之过。教不严，师之惰。子不学，非所宜。幼不学，老何为。\n")

os.makedirs('public/audio/books', exist_ok=True)

# 1. 先生成一份干净的原始录音
raw = '/tmp/meng_raw.mp3'
txt = '/tmp/meng_raw.txt'
with open(txt, 'w') as f:
    f.write(text)
subprocess.run(['python3', '-m', 'edge_tts', '--voice', 'zh-CN-XiaoyiNeural',
                '--rate=-30%', '--pitch=+10Hz', '--file', txt, '--write-media', raw],
               capture_output=True, timeout=300)
os.remove(txt)

if not os.path.exists(raw):
    sys.exit("生成失败")

d = json.loads(subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'json', raw],
                               capture_output=True, text=True).stdout)
print(f"原始: {os.path.getsize(raw)//1024}KB / {float(d['format']['duration']):.1f}s", file=sys.stderr)

# 2. 用 ffmpeg 变调生成第二个声音（asetrate+atempo 升调不变速）
# asetrate 提高采样率→音调升高但播放变快，atempo 拉回原速
shifted = '/tmp/meng_shifted.mp3'
subprocess.run(['ffmpeg', '-y', '-i', raw,
                '-af', 'asetrate=48000*1.12,atempo=1/1.12',
                '-ac', '1', '-ar', '24000', shifted],
               capture_output=True, timeout=30)
# asetrate 需要确保输出采样正确，用 aresample 兜底
# 或者用简单方法：先升采样再降回来
if not os.path.exists(shifted) or os.path.getsize(shifted) < 100:
    # 备用方案：直接 rubberband 强制保持 tempo
    subprocess.run(['ffmpeg', '-y', '-i', raw,
                    '-af', 'rubberband=tempo=1:pitch=1.12',
                    '-ac', '1', '-ar', '24000', shifted],
                   capture_output=True, timeout=30)

d2 = json.loads(subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'json', shifted],
                                capture_output=True, text=True).stdout)
print(f"变调: {os.path.getsize(shifted)//1024}KB / {float(d2['format']['duration']):.1f}s", file=sys.stderr)

# 3. 混合：原始(0.85) + 变调(0.55) = 两人齐读，永远同步
out = 'public/audio/books/三字经_人之初_原文.mp3'
r = subprocess.run(['ffmpeg', '-y', '-i', raw, '-i', shifted,
                    '-filter_complex', '[0:a]volume=0.85[a0];[1:a]volume=0.55[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2,volume=1.2',
                    '-ac', '1', '-ar', '24000', out],
                   capture_output=True, text=True, timeout=30)

if r.returncode == 0:
    d = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'json', out], capture_output=True, text=True)
    dur = json.loads(d.stdout)['format']['duration']
    print(f"\n✅ ({os.path.getsize(out)//1024}KB / {float(dur):.1f}s)", file=sys.stderr)
    for p in [raw, shifted]:
        try: os.remove(p)
        except: pass
else:
    print(f"❌ 失败: {r.stderr[:200]}", file=sys.stderr)
