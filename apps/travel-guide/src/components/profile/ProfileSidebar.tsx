// 个人中心左侧菜单（P0-1）
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon, GuidebookIcon, BabyIcon, MapPinIcon, TrophyIcon, SettingsIcon, SparklesIcon,
} from '@/components/Icons';

interface ProfileSidebarProps {
  user: { nickname?: string; avatar?: string | null } | null;
  counts?: {
    guides?: number;
    children?: number;
    sayings?: number;
    badges?: number;
  };
}

const ITEMS = [
  { href: '/profile', label: '总览', icon: HomeIcon, exact: true },
  { href: '/profile/guides', label: '我的攻略', icon: GuidebookIcon, countKey: 'guides' as const },
  { href: '/profile/children', label: '孩子档案', icon: BabyIcon, countKey: 'children' as const },
  { href: '/profile/sayings', label: '孩子说', icon: SparklesIcon, countKey: 'sayings' as const },
  { href: '/profile/badges', label: '勋章墙', icon: TrophyIcon, countKey: 'badges' as const },
  { href: '/profile/footprints', label: '足迹地图', icon: MapPinIcon, disabled: true },
  { href: '/profile/settings', label: '设置', icon: SettingsIcon },
];

export default function ProfileSidebar({ user, counts = {} }: ProfileSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      {/* 用户小卡片（移动端也用） */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            (user?.nickname ?? '?')[0]
          )}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{user?.nickname ?? '童慧行用户'}</p>
          <p className="text-xs text-gray-500">个人中心</p>
        </div>
      </div>

      {/* 菜单 */}
      <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const count = item.countKey ? counts[item.countKey] : undefined;
          const baseCls = 'flex items-center gap-3 px-4 py-3 transition border-l-4';
          const stateCls = item.disabled
            ? 'border-transparent text-gray-400 cursor-not-allowed bg-gray-50/50'
            : active
              ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
              : 'border-transparent text-gray-700 hover:bg-gray-50';
          const inner = (
            <>
              <Icon size={18} className={active ? 'text-blue-600' : item.disabled ? 'text-gray-400' : 'text-gray-500'} />
              <span className="flex-1">{item.label}</span>
              {item.disabled && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500">即将上线</span>}
              {!item.disabled && count !== undefined && count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{count}</span>
              )}
            </>
          );
          if (item.disabled) {
            return (
              <div key={item.href} className={`${baseCls} ${stateCls}`}>
                {inner}
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href} className={`${baseCls} ${stateCls}`}>
              {inner}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}