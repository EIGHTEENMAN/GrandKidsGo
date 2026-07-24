// 录音组件（R-2/R-3/R-4/R-5）
// 流程：录制 → 试听 + 进度条 → 家长确认 → 上传 → 自动审核状态展示
//
// 设计要点：
//   1. 录制完不直接上传，弹试听卡片
//   2. 家长必须听完（播放进度 ≥ 95%）才能点「确认上传」
//   3. 上传时显示进度
//   4. 上传后服务端返回审核状态，UI 实时展示（auditing / published / rejected）
//   5. rejected 可「重新录制」，auditing 显示等待文案

'use client';
import { useEffect, useRef, useState } from 'react';
import { SparklesIcon, CheckIcon, AlertIcon, RefreshIcon, PlayIcon } from '@/components/Icons';

interface VoiceRecorderProps {
  onUploaded?: (result: { id: string; status: string; reviewReason?: string | null }) => void;
  /** 当前是编辑已有 saying 还是新建（新建默认 status='auditing'） */
  childId?: string | null;
  mood?: string | null;
  spotId?: string | null;
  /** 是否在「编辑攻略」中嵌入，是则需支持多 child saying 并联 */
  compact?: boolean;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'recording'; startedAt: number; elapsed: number }
  | { kind: 'recorded'; blob: Blob; duration: number; mime: string; url: string }
  | { kind: 'playing'; duration: number; playedSeconds: number; url: string }
  | { kind: 'uploading'; progress: number }
  | { kind: 'reviewing' }
  | { kind: 'done'; status: 'published' | 'auditing' | 'rejected'; reviewReason?: string | null }
  | { kind: 'error'; message: string };

const MAX_DURATION = 60; // 60 秒上限
const MIN_PLAYED_RATIO = 0.95; // 至少听完 95% 才能确认

export default function VoiceRecorder({ onUploaded, childId, mood, spotId, compact }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  // 卸载时清理
  useEffect(() => {
    return () => {
      recorderRef.current?.state === 'recording' && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // 录制中每秒更新 elapsed
  function startTick() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setPhase(p => {
        if (p.kind !== 'recording') return p;
        const elapsed = Math.floor((Date.now() - p.startedAt) / 1000);
        if (elapsed >= MAX_DURATION) {
          stopRecording();
          return p;
        }
        return { ...p, elapsed };
      });
    }, 250);
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase({ kind: 'error', message: '当前浏览器不支持录音功能，建议使用 Chrome' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const startedAt = startedAtRef.current ?? Date.now();
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setPhase({ kind: 'recorded', blob, duration: elapsed, mime, url });
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      // 记录开始时间（onstop 时用）
      startedAtRef.current = Date.now();
      recorder.start();
      recorderRef.current = recorder;
      setPhase({ kind: 'recording', startedAt: Date.now(), elapsed: 0 });
      startTick();
    } catch {
      setPhase({ kind: 'error', message: '录音权限被拒绝，请在浏览器设置中允许麦克风' });
    }
  }

  function stopRecording() {
    if (tickRef.current) clearInterval(tickRef.current);
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }

  function discardRecording() {
    if (phase.kind === 'recorded' || phase.kind === 'playing') {
      URL.revokeObjectURL(phase.url);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPhase({ kind: 'idle' });
  }

  function startPlayback(duration: number, url: string) {
    const audio = new Audio(url);
    audioRef.current = audio;
    setPhase({ kind: 'playing', duration, playedSeconds: 0, url });

    audio.ontimeupdate = () => {
      setPhase(p => {
        if (p.kind !== 'playing') return p;
        return { ...p, playedSeconds: Math.floor(audio.currentTime) };
      });
    };
    audio.onended = () => {
      setPhase({ kind: 'recorded', blob: phase.kind === 'playing' ? (new Blob()) : (new Blob()), duration, mime: '', url });
    };
    audio.play().catch(() => {
      setPhase({ kind: 'error', message: '播放失败' });
    });
  }

  async function confirmUpload() {
    if (phase.kind !== 'recorded') return;
    const { blob, duration, mime } = phase;
    if (blob.size === 0) return;

    setPhase({ kind: 'uploading', progress: 0 });
    try {
      const form = new FormData();
      form.append('audio', blob, `recording.${mime.split('/')[1] ?? 'webm'}`);
      if (childId) form.append('childId', childId);
      if (mood) form.append('mood', mood);
      if (spotId) form.append('spotId', spotId);
      form.append('duration', String(duration));

      setPhase({ kind: 'reviewing' });

      const userId = localStorage.getItem('haodaer_user_id') ?? '';  // 不敏感，前端仅用于显示
      const res = await fetch('/api/child-sayings/voice-upload', {
        method: 'POST',
        headers: { 'x-debug-user-id': userId },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setPhase({ kind: 'error', message: json?.error?.message ?? '上传失败' });
        return;
      }
      const data = json?.data ?? json;
      setPhase({ kind: 'done', status: data.status, reviewReason: data.voiceRejectReason });
      onUploaded?.({ id: data.id, status: data.status, reviewReason: data.voiceRejectReason });
    } catch (e) {
      setPhase({ kind: 'error', message: (e as Error).message ?? '上传异常' });
    }
  }

  // ============ 渲染 ============

  if (phase.kind === 'idle') {
    return (
      <button
        onClick={startRecording}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:shadow-md transition"
      >
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        开始录音
      </button>
    );
  }

  if (phase.kind === 'recording') {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-700 font-bold">录音中… {phase.elapsed}s / {MAX_DURATION}s</span>
        <button
          onClick={stopRecording}
          className="ml-auto px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition"
        >
          结束录音
        </button>
      </div>
    );
  }

  if (phase.kind === 'recorded' || phase.kind === 'playing') {
    const duration = phase.duration;
    const played = phase.kind === 'playing' ? phase.playedSeconds : 0;
    const ratio = duration > 0 ? played / duration : 0;
    const canConfirm = phase.kind === 'recorded' && ratio >= MIN_PLAYED_RATIO;
    // 注：phase.kind === 'recorded' 默认 ratio=0（重置），所以重录后必须重新播放并听完才能确认

    return (
      <div className="p-4 bg-white border-2 border-blue-200 rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => startPlayback(duration, phase.url)}
            disabled={phase.kind === 'playing'}
            className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition disabled:opacity-50"
            aria-label="试听录音"
          >
            <PlayIcon size={16} />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 font-medium">{phase.kind === 'playing' ? '播放中' : '待确认'}</span>
              <span className="text-gray-500">{played}s / {duration}s</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                style={{ width: `${Math.min(ratio * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 提示：必须听完才能确认 */}
        {phase.kind === 'recorded' && !canConfirm && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            🎧 请先试听完整段录音（至少听完 95%），然后才能确认上传
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={discardRecording}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition inline-flex items-center justify-center gap-1"
          >
            <RefreshIcon size={14} /> 再录一次
          </button>
          <button
            onClick={confirmUpload}
            disabled={!canConfirm}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold hover:shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
          >
            <CheckIcon size={14} /> 确认上传
          </button>
        </div>
      </div>
    );
  }

  if (phase.kind === 'uploading' || phase.kind === 'reviewing') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
        <div className="flex items-center justify-center gap-2 text-blue-700">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="font-medium">
            {phase.kind === 'uploading' ? '上传中…' : '自动审核中（敏感词扫描）…'}
          </span>
        </div>
      </div>
    );
  }

  if (phase.kind === 'done') {
    if (phase.status === 'published') {
      return (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700">
          <CheckIcon size={16} />
          <span className="text-sm font-medium">录音已通过审核并发布</span>
        </div>
      );
    }
    if (phase.status === 'auditing') {
      return (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-700">
          <SparklesIcon size={16} />
          <span className="text-sm font-medium">录音已上传，等待人工复核</span>
        </div>
      );
    }
    // rejected
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-red-700">
          <AlertIcon size={16} />
          <span className="text-sm font-medium">录音未通过审核</span>
        </div>
        {phase.reviewReason && (
          <p className="text-xs text-red-600 ml-6">原因：{phase.reviewReason}</p>
        )}
        <button
          onClick={() => setPhase({ kind: 'idle' })}
          className="ml-6 text-xs px-3 py-1 bg-white border border-red-300 text-red-700 rounded-full hover:bg-red-50"
        >
          重新录制
        </button>
      </div>
    );
  }

  // error
  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
      <AlertIcon size={14} />
      <span className="text-sm flex-1">{phase.message}</span>
      <button onClick={() => setPhase({ kind: 'idle' })} className="text-xs underline">重试</button>
    </div>
  );
}