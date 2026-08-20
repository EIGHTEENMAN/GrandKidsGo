'use client';
// GEO: 走天下 about 页 — 客户端 JSON-LD 注入（Organization + Dataset）
import { useEffect } from 'react';
import { TRAVEL_ORGANIZATION_JSONLD } from '@/lib/jsonld';

export default function AboutJsonLd() {
  useEffect(() => {
    const dataset = {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: '童慧行·孩子真实景点反馈数据集 2026',
      description: '覆盖 50+ 城市、1500+ 景点、5000+ 条 3-12 岁孩子的真实反馈数据。包含兴趣度评分、推荐停留时长、年龄适配、必玩项目、双维度评分（大人 vs 孩子）、便利设施完备度。所有数据严格遵循《未成年人保护法》，已去标识化处理。',
      url: 'https://travel.grandand.com/about#dataset',
      creator: {
        '@type': 'Organization',
        name: '童慧行走天下',
        url: 'https://travel.grandand.com',
      },
      keywords: '亲子游,儿童反馈,景点评测,年龄适配,母婴设施,双维度评分',
      license: 'https://creativecommons.org/licenses/by-nc/4.0/',
      temporalCoverage: '2024-01/2026-08',
      spatialCoverage: { '@type': 'Country', name: '中国大陆' },
      distribution: {
        '@type': 'DataDownload',
        contentUrl: 'https://travel.grandand.com/data/kids-feedback-2026.csv',
        encodingFormat: 'text/csv',
      },
      variableMeasured: [
        '城市', '景点名称', '景点类型',
        '成人评分(1-5)', '孩子评分(1-5)', '孩子月龄',
        '是否有停车', '是否有宝宝椅', '是否有母婴室', '婴儿车友好',
        '家长评价文本', '评价日期',
        '孩子说', '孩子心情',
        '评价总数',
      ],
      size: '5000',
      dateModified: '2026-08-20',
      inLanguage: 'zh-CN',
    };

    const dataset2 = {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: '童慧行·母婴设施地图数据集 2026',
      description: '覆盖 50+ 城市的景点母婴设施完备度数据，包含停车场率、母婴室率、宝宝椅率、婴儿车友好率，以及周边 13 类 POI（亲子餐厅、母婴室、直饮水点、便利店、玩具书店、儿童书店、儿童医院、药店、母婴店、网约车点、亲子酒店等）。所有数据来自真实家庭反馈，去标识化处理。',
      url: 'https://travel.grandand.com/about#baby-facility-dataset',
      creator: { '@type': 'Organization', name: '童慧行走天下', url: 'https://travel.grandand.com' },
      keywords: '母婴设施,母婴室,宝宝椅,婴儿车,亲子餐厅,儿童医院,便利店',
      license: 'https://creativecommons.org/licenses/by-nc/4.0/',
      temporalCoverage: '2024-01/2026-08',
      spatialCoverage: { '@type': 'Country', name: '中国大陆' },
      distribution: { '@type': 'DataDownload', contentUrl: 'https://travel.grandand.com/data/baby-friendly-facilities-2026.csv', encodingFormat: 'text/csv' },
      variableMeasured: [
        '景点名称', '城市', '景点类型',
        '设施类别', '设施名称', '距离(米)', '是否已验证',
        '停车率', '宝宝椅率', '母婴室率', '婴儿车友好率',
        '综合亲子友好分', '评价总数',
      ],
      size: '50000',
      dateModified: '2026-08-20',
      inLanguage: 'zh-CN',
    };

    const schemas = [TRAVEL_ORGANIZATION_JSONLD, dataset, dataset2];
    document.querySelectorAll('[id^="geo-about-jsonld-"]').forEach(el => el.remove());
    schemas.forEach((s, i) => {
      const script = document.createElement('script');
      script.id = `geo-about-jsonld-${i}`;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(s);
      document.head.appendChild(script);
    });
    return () => {
      document.querySelectorAll('[id^="geo-about-jsonld-"]').forEach(el => el.remove());
    };
  }, []);
  return null;
}
