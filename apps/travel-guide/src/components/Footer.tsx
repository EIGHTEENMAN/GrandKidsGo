/**
 * 走天下 Footer 组件（React 版本）
 *
 * 显示页面底部链接 + 备案号（闽ICP备 xxx 号-2 + 闽公网安备号）
 *
 * 对应主方案第六阶段：IcpFooter 组件统一接入
 */

import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 链接区 */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-sm text-gray-500">
          <a href="/about" className="hover:text-gray-700">关于我们</a>
          <a href="/legal/privacy" className="hover:text-gray-700">隐私政策</a>
          <a href="/legal/terms" className="hover:text-gray-700">服务条款</a>
          <a href="/legal/guardian" className="hover:text-gray-700">监护人须知</a>
          <a href="/faq" className="hover:text-gray-700">常见问题</a>
        </div>

        {/* 版权 */}
        <p className="text-center text-xs text-gray-400 mb-3">
          &copy; 2026 童慧行走天下 &mdash; 亲子旅行社区
        </p>

        {/* 备案号 */}
        <p className="text-center text-xs text-gray-400 flex justify-center items-center flex-wrap gap-x-2">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            闽ICP备 2026xxxxxx 号-2
          </a>
          <span className="text-gray-300">|</span>
          <a
            href="https://beian.mps.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            🛡 闽公网安备 35000000xxxxxx 号
          </a>
        </p>
      </div>
    </footer>
  );
}
