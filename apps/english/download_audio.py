#!/usr/bin/env python3
"""Download real human voice MP3s for English words from Google Pronunciation CDN."""
import os, re, time, sys, urllib.request, urllib.error

AUDIO_DIR = "/app/ultraman-english/public/audio"
DATA_FILE = "/app/ultraman-english/src/data/words.ts"
os.makedirs(AUDIO_DIR, exist_ok=True)

with open(DATA_FILE) as f:
    content = f.read()

words = set()
for m in re.finditer(r'"word":\s*"([^"]+)"', content):
    w = m.group(1).strip().lower()
    if w and re.match(r"^[a-zA-Z ]+$", w):
        words.add(w)

all_words = sorted(words)
print(f"Found {len(all_words)} unique English words", flush=True)

existing = {f.replace(".mp3", "") for f in os.listdir(AUDIO_DIR) if f.endswith(".mp3")}
print(f"Already have {len(existing)} files", flush=True)
to_download = [w for w in all_words if w not in existing]
print(f"Need to download: {len(to_download)} words", flush=True)

if not to_download:
    print("All done!", flush=True)
    sys.exit(0)

GOOGLE_CDN_TEMPLATES = [
    "https://ssl.gstatic.com/dictionary/static/sounds/20200429/{word}--_us_1.mp3",
    "https://ssl.gstatic.com/dictionary/static/sounds/oxford/{word}--_us_1.mp3",
]

def download_url(url, dest, timeout=5):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = resp.read()
                if len(data) > 1000:
                    with open(dest, "wb") as f:
                        f.write(data)
                    return True
        return False
    except Exception:
        return False

success = 0
failed = []
start = time.time()
for i, word in enumerate(to_download):
    safe_word = word.replace(" ", "_")
    dest = os.path.join(AUDIO_DIR, f"{word}.mp3")
    downloaded = False
    for tmpl in GOOGLE_CDN_TEMPLATES:
        url = tmpl.format(word=safe_word)
        if download_url(url, dest):
            downloaded = True
            break
    if downloaded:
        success += 1
    else:
        failed.append(word)
    if (i + 1) % 100 == 0 or i == len(to_download) - 1:
        elapsed = time.time() - start
        rate = (i + 1) / elapsed * 60
        print(f"  Progress: {i+1}/{len(to_download)}  |  OK: {success}  |  Failed: {len(failed)}  |  {rate:.0f} words/min", flush=True)
    time.sleep(0.5)

elapsed = time.time() - start
print(f"\n=== Download Complete ===", flush=True)
print(f"Downloaded: {success}  |  Failed: {len(failed)}  |  Time: {elapsed:.0f}s", flush=True)

if failed:
    print(f"\nFailed words ({len(failed)}):", flush=True)
    for w in failed:
        print(f"  {w}", flush=True)
    with open("/app/ultraman-english/failed_words.txt", "w") as f:
        f.write("\n".join(failed))

print(f"\nTotal in audio dir: {len(os.listdir(AUDIO_DIR))}", flush=True)
