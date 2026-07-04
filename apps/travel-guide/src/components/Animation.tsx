'use client';

import { ReactNode } from 'react';

const keyframes = `
@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fadeInUp { animation: fadeInUp 0.6s ease-out both; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out both; }
`;

export default function AnimationStyles() {
  return <style>{keyframes}</style>;
}

type AnimProps = { children: ReactNode; delay?: number; className?: string; key?: string };

export function FadeInUp({ children, delay, className }: AnimProps) {
  const cls = `animate-fadeInUp${className ? ` ${className}` : ''}`;
  return <div className={cls} style={delay ? { animationDelay: `${delay}ms` } : undefined}>{children}</div>;
}

export function FadeIn({ children, delay, className }: AnimProps) {
  const cls = `animate-fadeIn${className ? ` ${className}` : ''}`;
  return <div className={cls} style={delay ? { animationDelay: `${delay}ms` } : undefined}>{children}</div>;
}
