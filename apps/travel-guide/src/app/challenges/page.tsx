'use client';
import { useEffect, useState } from 'react';

type Challenge = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  startAt: string;
  endAt: string;
  participants: { user: { nickname: string } }[];
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    fetch('/api/challenges').then(r => r.json()).then(d => setChallenges(d.data || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <a href="/" className="text-green-500 text-sm">&larr; 首页</a>
          <h1 className="text-xl font-bold text-gray-900 mt-1">主题挑战</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {challenges.map(c => (
          <div key={c.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="h-32 bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center text-white text-xl font-bold">
              {c.title}
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-3">{c.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{c.startAt?.slice(0, 10)} ~ {c.endAt?.slice(0, 10)}</span>
                <span>{c.participants?.length || 0} 人参与</span>
              </div>
            </div>
          </div>
        ))}
        {challenges.length === 0 && <p className="text-center py-10 text-gray-400">暂无挑战活动</p>}
      </div>
    </div>
  );
}
