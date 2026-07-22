// 走天下 SVG 图标库（v4.0）
// 替换所有 emoji 图标，提供更专业、更一致的视觉
// 设计原则：纯 SVG、24x24 视口、currentColor 可改色

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, props: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

// ===== 导航类 =====

export const HomeIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-7h6v7" />
  </svg>
);

export const BackIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const ChevronRight = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const ChevronDown = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const CloseIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const SearchIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

// ===== 城市/地点类 =====

export const CityIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 9h.01M9 12h.01M9 15h.01M9 18h.01M15 9h.01M15 12h.01M15 15h.01M15 18h.01" />
  </svg>
);

export const MapPinIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const GuidebookIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z" />
    <path d="M4 16a4 4 0 0 1 4-4h12" />
  </svg>
);

// ===== 体验/活动类（替代 emoji） =====

export const BeachIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="6" r="2.5" />
    <path d="M6 20c0-2 2-4 6-4s6 2 6 4" />
    <path d="M3 18h18" />
  </svg>
);

export const MountainIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M2 20l6-10 4 6 3-5 7 9H2z" />
    <path d="M14 8l-1 2" />
  </svg>
);

export const WaterIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 3c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z" />
  </svg>
);

export const BookIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M4 4h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4V4z" />
    <path d="M20 4h-7a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h7V4z" />
  </svg>
);

export const LeafIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 21c0-7 5-12 12-12-1 7-6 12-12 12z" />
    <path d="M3 21c4-4 7-7 12-12" />
  </svg>
);

export const ParkIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="8" cy="18" r="3" />
    <circle cx="16" cy="18" r="3" />
    <path d="M12 18V9" />
    <path d="M9 4c2 0 3 2 3 5M15 4c-2 0-3 2-3 5" />
  </svg>
);

export const CampIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M2 20l10-14 10 14H2z" />
    <path d="M9 14l3-4 3 4" />
    <path d="M12 6V3" />
  </svg>
);

export const StarIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" />
  </svg>
);

export const SparklesIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const SunIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const HeartIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

export const CameraIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 7h3l2-3h8l2 3h3v13H3z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const PhoneIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 13 13 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 13 13 0 0 0 2.8.7 2 2 0 0 1 1.7 2z" />
  </svg>
);

export const UserIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
  </svg>
);

export const BookmarkIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M6 3h12v18l-6-4-6 4V3z" />
  </svg>
);

export const ClockIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const EyeIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const PlayIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M6 4l14 8-14 8V4z" fill="currentColor" />
  </svg>
);

export const ArrowRightIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const RefreshIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 12a9 9 0 0 1 16-6.7L22 7" />
    <path d="M22 3v4h-4" />
    <path d="M21 12a9 9 0 0 1-16 6.7L2 17" />
    <path d="M2 21v-4h4" />
  </svg>
);

export const AwardIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="9" r="6" />
    <path d="M9 14l-2 7 5-3 5 3-2-7" />
  </svg>
);

export const TrophyIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M6 9a6 6 0 0 0 12 0V4H6v5z" />
    <path d="M6 4H4v2a3 3 0 0 0 3 3M18 4h2v2a3 3 0 0 1-3 3M9 21h6M12 17v4" />
  </svg>
);

export const SettingsIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const CheckIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M5 12l5 5L20 7" />
  </svg>
);

export const AlertIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 2L1 21h22L12 2z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const BuildingIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <rect x="4" y="3" width="16" height="18" />
    <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
  </svg>
);

export const ForkIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="6" cy="3" r="2" />
    <circle cx="18" cy="3" r="2" />
    <circle cx="6" cy="21" r="2" />
    <path d="M6 5v6c0 1 .5 2 2 2h8c1.5 0 2-1 2-2V5M12 13v6" />
  </svg>
);

export const CheckCircleIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l3 3 5-6" />
  </svg>
);

// ===== 装饰类 =====

export const FireIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M8.5 14a4 4 0 0 0 7 0c0-2-1.5-3-3-5 0-2 1-4 1-4s-5 2-5 9z" />
    <path d="M12 22a6 6 0 0 0 6-6c0-3-2-5-4-7-1 2-2 4-2 6" />
  </svg>
);

export const HandPointUpIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M9 11V6a2 2 0 1 1 4 0v5" />
    <path d="M13 8a2 2 0 1 1 4 0v5" />
    <path d="M17 9a2 2 0 1 1 3 0v6a7 7 0 0 1-14 0v-3a2 2 0 1 1 4 0" />
  </svg>
);

export const PlaneIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M2 13l9-3 4-7 2 1-2 7 7 4-1 2-7-2-3 7-2-1 1-7-8-2z" />
  </svg>
);

export const CrownIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M2 7l4 5 6-7 6 7 4-5v13H2z" />
    <path d="M2 17h20" />
  </svg>
);

export const MedalIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="15" r="5" />
    <path d="M8 11L5 3h4l3 5M16 11l3-8h-4l-3 5" />
  </svg>
);

export const ThumbsUpIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M7 10v11" />
    <path d="M14 4l-1 6h6a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 2H7V10l4-7a2 2 0 0 1 4 1z" />
  </svg>
);

export const BabyIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M9 8h.01M15 8h.01" />
    <path d="M9 10c.7 1 1.7 1.5 3 1.5s2.3-.5 3-1.5" />
    <path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
  </svg>
);

// ===== 类别图标（亲子宝典 13 类） =====

export const RestaurantIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M5 3v8a2 2 0 0 0 2 2v8" />
    <path d="M9 3v18" />
    <path d="M14 13a3 3 0 0 0 3-3V3h-1v6h-2V3h-1v7a2 2 0 0 0 1 1.7z" />
  </svg>
);

export const HotelIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 21V7l9-4 9 4v14" />
    <path d="M9 21v-7h6v7" />
    <path d="M7 9h.01M11 9h.01M15 9h.01M7 12h.01M11 12h.01M15 12h.01" />
  </svg>
);

export const TransportIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <rect x="4" y="3" width="16" height="14" rx="3" />
    <circle cx="8" cy="17" r="2" />
    <circle cx="16" cy="17" r="2" />
    <path d="M4 11h16" />
  </svg>
);

export const MedicalIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 4v16M4 12h16" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export const StoreIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M3 9v11h18V9" />
    <path d="M3 9h18" />
    <path d="M9 13h6" />
  </svg>
);

export const PlaygroundIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="6" r="3" />
    <path d="M12 9v6" />
    <path d="M9 21l3-6 3 6" />
    <path d="M6 12h12" />
  </svg>
);

export const ScienceIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M9 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-10V3" />
    <path d="M8 3h8" />
    <path d="M7 14h10" />
  </svg>
);

export const LibraryIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M4 5a2 2 0 0 1 2-2h2v18H6a2 2 0 0 1-2-2z" />
    <path d="M10 3h2v18h-2z" />
    <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4z" />
  </svg>
);

export const MuseumIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 21h18" />
    <path d="M3 10h18" />
    <path d="M12 3l9 7H3z" />
    <path d="M5 10v11M9 10v11M15 10v11M19 10v11" />
  </svg>
);

export const AquariumIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
    <path d="M3 12c2 3 4 3 6 0s4-3 6 0 4 3 6 0" />
    <circle cx="7" cy="9" r="0.6" fill="currentColor" />
    <circle cx="14" cy="14" r="0.6" fill="currentColor" />
    <circle cx="18" cy="10" r="0.6" fill="currentColor" />
  </svg>
);
