// 孩子说 — 童言趣语记录（v1.0 + 2026-07-24 录音增强）
// 时间线 + 文字输入 + 表情标签 + 录音（录制→试听确认→自动审核）
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HandPointUpIcon, HeartIcon, SparklesIcon, BabyIcon, PlayIcon } from '@/components/Icons';
import VoiceRecorder from '@/components/VoiceRecorder';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Saying {
  id: string;
  text: string;
  mood: string | null;
  shareScope: string;
  createdAt: string;
  childId: string | null;
  status: string;
  voiceOssKey?: string | null;
  voiceDuration?: number | null;
  voiceRejectReason?: string | null;
}

const MOODS = [
  { key: '开心', emoji: 'happy', bg: 'bg-amber-50 text-amber-600 border-amber-200' },
  { key: '困惑', emoji: 'confused', bg: 'bg-purple-50 text-purple-600 border-purple-200' },
  { key: '惊讶', emoji: 'surprised', bg: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { key: '生气', emoji: 'angry', bg: 'bg-pink-50 text-pink-600 border-pink-200' },
  { key: '困了', emoji: 'sleepy', bg: 'bg-blue-50 text-blue-600 border-blue-200' },
];

export default function ChildSayingsPage() {
  const [items, setItems] = useState<Saying[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('grandkidsgo_token') : null;

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/child-sayings?shareScope=public,private,community`)
      .then(r => r.json())
      .then(d => setItems(d.data?.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!text.trim() || !token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${TRAVEL_API}/api/child-sayings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, mood, shareScope: 'private' }),
      });
      const d = await res.json();
      if (d.code === 'OK') { setText(''); setMood(null); location.reload(); }
      else alert(d.message || '提交失败');
    } catch { alert('网络错误'); }
    finally { setSubmitting(false); }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3 inline-flex items-center gap-3">
            <HandPointUpIcon size={28} className="text-pink-200" /> 孩子说
          </h1>
          <p className="text-blue-100 mt-2 text-sm md:text-base">童言趣语 · 记录那些珍贵的成长瞬间</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {token && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 space-y-3">
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="孩子今天说了什么？（或用下方录音）"
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-300 bg-white" />
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <button key={m.key} onClick={() => setMood(mood === m.key ? null : m.key)}
                  className={`px-3 py-1 rounded-full text-xs border transition ${mood === m.key ? `${m.bg} border-2` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {m.key}
                </button>
              ))}
            </div>
            <button onClick={submit} disabled={!text.trim() || submitting}
              className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl text-sm disabled:opacity-50 hover:shadow-md transition">
              {submitting ? '记录中…' : '记录下来'}
            </button>

            {/* 录音区（R-2/R-3/R-4/R-5 一体） */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2 inline-flex items-center gap-1">
                🎤 或者直接录音：
              </p>
              <VoiceRecorder
                mood={mood}
                onUploaded={() => {
                  setText('');
                  setMood(null);
                  // 重新拉列表展示新发布的童言
                  fetch(`${TRAVEL_API}/api/child-sayings?shareScope=public,private,community`)
                    .then(r => r.json())
                    .then(d => setItems(d.data?.items ?? []))
                    .catch(() => {});
                }}
              />
            </div>
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400">加载中…</div>}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-pink-50 flex items-center justify-center">
              <BabyIcon size={28} className="text-pink-500" />
            </div>
            <div className="text-gray-500 mb-1">还没有孩子说的话</div>
            <div className="text-sm text-gray-400">旅行中孩子的童言趣语会出现在这里</div>
          </div>
        )}

        <div className="space-y-3">
          {items.map(it => {
            const hasVoice = !!it.voiceOssKey;
            const reviewing = it.status === 'auditing';
            const rejected = it.status === 'rejected';
            return (
              <div key={it.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center flex-shrink-0">
                    <BabyIcon size={18} className="text-pink-500" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-lg leading-relaxed mb-2">"{it.text}"</p>

                    {/* 录音播放条 */}
                    {hasVoice && !rejected && (
                      <div className="flex items-center gap-2 mt-2 mb-2 px-3 py-1.5 bg-gray-50 rounded-full w-fit max-w-xs">
                        <button
                          onClick={() => {
                            const a = new Audio(`${TRAVEL_API}/api/child-sayings/${it.id}/voice`); // 后端 OSS 代理
                            a.play().catch(() => alert('播放失败'));
                          }}
                          className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 flex-shrink-0"
                          aria-label="播放录音"
                        >
                          <PlayIcon size={12} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
                            <div className="h-full w-0 bg-gradient-to-r from-blue-500 to-cyan-500" />
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs text-gray-500">录音</span>
                            <span className="text-xs text-gray-500">{it.voiceDuration ?? '?'}s</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      {it.mood && (
                        <span className="px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full">{it.mood}</span>
                      )}
                      <span className="text-gray-400">{new Date(it.createdAt).toLocaleDateString('zh-CN')}</span>
                      {it.shareScope !== 'private' && (
                        <span className="text-gray-400">· {it.shareScope === 'public' ? '公开' : '社区'}</span>
                      )}
                      {reviewing && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full inline-flex items-center gap-1">
                          <SparklesIcon size={10} /> 录音审核中
                        </span>
                      )}
                      {rejected && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full">
                          审核未过{it.voiceRejectReason ? ` · ${it.voiceRejectReason}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}