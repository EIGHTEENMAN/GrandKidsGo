// components/FootprintMap.tsx — 高德 JS API 交互式地图（足迹地图 v2.3）
// 客户端组件，仅 ssr:false 引用
//
// 功能：
//   - 加载高德地图，center 默认中国中心 (103.988, 36.55)，zoom 4
//   - 按 footprint.cityId 在 city 列表里找 lat/lng（footprint 没存 lat/lng 时）
//   - 三态 marker：visited (蓝) / wishlist (琥珀) / child_wishlist (粉)
//   - 点击 marker 弹窗：城市名 + 状态 + 时间 + 来源 + 备注
//
// 数据来源：
//   - props.footprints（已过滤）
//   - props.cities（含 lat/lng 的精简版）

'use client';
import { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

interface FootprintLite {
  id: string;
  cityId: string | null;
  spotId: string | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  state: 'visited' | 'wishlist' | 'child_wishlist';
  source: string;
  checkinAt: string | null;
  note: string | null;
  createdAt: string;
}

interface CityMini {
  id: string;
  name: string;
}

interface Props {
  footprints: FootprintLite[];
  cities: CityMini[];
}

const STATE_COLOR: Record<string, string> = {
  visited: '#1d4ed8', // blue-700
  wishlist: '#f59e0b', // amber-500
  child_wishlist: '#ec4899', // pink-500
};

const STATE_LABEL: Record<string, string> = {
  visited: '已去过',
  wishlist: '想去',
  child_wishlist: '孩子想去',
};

const SOURCE_LABEL: Record<string, string> = {
  manual: '手动打卡',
  from_plan: '来自行程',
  from_guide: '来自攻略',
};

export default function FootprintMap({ footprints, cities }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 一次性加载地图
  useEffect(() => {
    let cancelled = false;
    async function init() {
      // 兼容 build-time / ssr 的 process.env 暴露
      const key = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_AMAP_JS_API_KEY) || '';
      if (!key) {
        setStatus('error');
        setErrorMsg('NEXT_PUBLIC_AMAP_JS_API_KEY 未配置');
        return;
      }
      try {
        const AMap = await AMapLoader.load({
          key,
          version: '2.0',
          plugins: ['AMap.Scale', 'AMap.ToolBar'],
        });
        if (cancelled || !containerRef.current) return;
        const map = new AMap.Map(containerRef.current, {
          zoom: 4,
          center: [103.988, 36.55],
          viewMode: '2D',
          mapStyle: 'amap://styles/normal',
        });
        mapRef.current = map;
        // 控件
        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: 'RB' }));
        setStatus('ready');
      } catch (e: any) {
        console.error('[FootprintMap] load failed:', e);
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(e?.message ?? '加载失败');
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch {}
        mapRef.current = null;
      }
    };
  }, []);

  // 数据更新 → 重绘 markers
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;

    // 清理旧 markers
    for (const m of markersRef.current) {
      try { mapRef.current.remove(m); } catch {}
    }
    markersRef.current = [];

    if (!footprints.length) return;

    // 取 AMap 全局
    const AMap = (window as any).AMap;
    if (!AMap) return;

    const cityById = new Map<string, CityMini & { lat: number; lng: number }>();
    for (const c of cities as any[]) {
      // cities list 来自 /api/cities，前端不知道 lat/lng → 这里只能从 footprint 自身拿
    }

    // 把 footprint 的 cityId 对应 city 的 lat/lng 找出来
    // footprint 自带 lat/lng 时用；否则从 cities 字段抽
    const points = footprints
      .map((fp) => {
        let lat = fp.lat ?? null;
        let lng = fp.lng ?? null;
        if ((lat == null || lng == null) && fp.cityId) {
          const c = (cities as any[]).find((c) => c.id === fp.cityId);
          if (c?.lat != null && c?.lng != null) {
            lat = c.lat;
            lng = c.lng;
          }
        }
        return lat != null && lng != null ? { fp, lat, lng } : null;
      })
      .filter((x): x is { fp: FootprintLite; lat: number; lng: number } => x !== null);

    if (!points.length) return;

    // 创建 marker
    const newMarkers: any[] = [];
    for (const { fp, lat, lng } of points) {
      const color = STATE_COLOR[fp.state] ?? '#3b82f6';
      const marker = new AMap.Marker({
        position: [lng, lat],
        content: `
          <div style="
            width: 22px; height: 22px; border-radius: 50%;
            background: ${color};
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 11px; font-weight: bold;
          ">${fp.state === 'visited' ? '✓' : fp.state === 'wishlist' ? '?' : '♥'}</div>
        `,
        offset: new AMap.Pixel(-11, -11),
        zIndex: 100,
      });
      // 弹窗
      const date = fp.checkinAt ?? fp.createdAt;
      const dateStr = date ? new Date(date).toLocaleDateString('zh-CN') : '';
      const html = `
        <div style="padding: 10px 14px; min-width: 180px;">
          <div style="font-weight: bold; color: #111; margin-bottom: 6px; font-size: 14px;">
            ${fp.placeName ?? '足迹'}
          </div>
          <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
            <span style="
              display: inline-block;
              width: 8px; height: 8px;
              border-radius: 50%;
              background: ${color};
            "></span>
            <span style="font-size: 12px; color: #555;">${STATE_LABEL[fp.state] ?? fp.state}</span>
            ${dateStr ? `<span style="font-size: 11px; color: #888; margin-left: auto;">${dateStr}</span>` : ''}
          </div>
          ${fp.source && SOURCE_LABEL[fp.source] ? `<div style="font-size: 11px; color: #888; margin-top: 2px;">${SOURCE_LABEL[fp.source]}</div>` : ''}
          ${fp.note ? `<div style="font-size: 12px; color: #444; margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">${fp.note}</div>` : ''}
        </div>
      `;
      const infoWindow = new AMap.InfoWindow({ content: html, offset: new AMap.Pixel(0, -12) });
      marker.on('click', () => {
        infoWindow.open(mapRef.current, [lng, lat]);
      });
      mapRef.current.add(marker);
      newMarkers.push(marker);
    }
    markersRef.current = newMarkers;

    // 自动 fitView（有 markers 时）
    if (newMarkers.length > 0) {
      try { mapRef.current.setFitView(newMarkers, false, [60, 60, 60, 60]); } catch {}
    }
  }, [footprints, cities, status]);

  if (status === 'error') {
    return (
      <div className="h-[420px] w-full rounded-2xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-sm font-bold text-gray-700 mb-2">地图加载失败</div>
        <div className="text-xs text-gray-500">{errorMsg}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
      <div
        ref={containerRef}
        className="h-[420px] w-full"
        style={{ minHeight: 420 }}
      />
      {status === 'loading' && (
        <div className="text-center text-xs text-gray-400 py-2 border-t border-gray-100">
          正在加载高德地图…
        </div>
      )}
    </div>
  );
}
