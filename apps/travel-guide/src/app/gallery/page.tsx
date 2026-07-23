// 儿童画廊 — 走天下 PC 端（v1.0）
// 孩子上传旅行照片 + 配说明（源 PlanMedia.planMedia sourceType='gallery'）
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartIcon, SparklesIcon, MapPinIcon, StarIcon, UserIcon, BabyIcon } from '@/components/Icons';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface GalleryItem {
  id: string;
  ossUrl: string | null;
  caption: string | null;
  childId: string | null;
  visibilityLevel: string;
  createdAt: string;
  spotId: string | null;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/gallery?visibilityLevel=public,private,community`)
      .then(r => r.json())
      .then(d => setItems(d.data?.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3 inline-flex items-center gap-3">
            <HeartIcon size={28} className="text-pink-200" /> 儿童画廊
          </h1>
          <p className="text-blue-100 mt-2 text-sm md:text-base">孩子旅行中拍下的照片 · 成长的足迹</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading && <div className="text-center py-12 text-gray-400">加载中…</div>}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
              <SparklesIcon size={28} className="text-blue-500" />
            </div>
            <div className="text-gray-500 mb-1">还没有孩子拍的照片</div>
            <div className="text-sm text-gray-400">完成一次出行后，照片就会出现在这里</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => setPreview(it)}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition border border-gray-100 text-left"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-blue-100 to-cyan-100 overflow-hidden">
                {it.ossUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={it.ossUrl} alt={it.caption ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <SparklesIcon size={36} className="text-blue-300" />
                  </div>
                )}
              </div>
              <div className="p-3">
                {it.caption && (
                  <p className="text-sm font-medium text-gray-900 truncate">{it.caption}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{it.visibilityLevel}</span>
                  <span className="text-[10px] text-gray-400">{new Date(it.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {preview && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
            <div className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {preview.ossUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview.ossUrl} alt={preview.caption ?? ''} className="w-full max-h-[70vh] object-contain bg-gray-100" />
              )}
              <div className="p-5">
                {preview.caption && <p className="font-bold text-gray-900 text-lg">{preview.caption}</p>}
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <BabyIcon size={14} />
                  <span>被拍摄者: {preview.childId || '待关联'}</span>
                  <span>·</span>
                  <span>{new Date(preview.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}