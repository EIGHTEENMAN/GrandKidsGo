// AI 攻略向导 — 高层函数
// 复用现有 AI 抽象层（lib/ai/registry）的 provider.json() 和 provider.chat()
// 详见 项目建设方案/AI攻略向导-实现方案.md

import { z } from "zod";
import { getProvider } from "./registry";

// ============================================================================
// 入参类型
// ============================================================================

export interface TravelWizardParams {
  fromCity: string;          // 出发城市
  destinationCity: string;   // 目的地
  days: number;              // 天数
  travelers: number;         // 出行人数
  childAges: number[];       // 儿童年龄（月龄）
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
  spotTypes: string[];       // 偏好景点类型
  transports: string[];      // 偏好交通方式
  budgetPerDay: number;      // 人均预算/天（元）
  hotelPreference?: string;  // 住宿要求（可选）
  extraNotes?: string;       // 用户备注（可选）
}

// ============================================================================
// 大纲类型
// ============================================================================

export interface GuideOutlineSection {
  day: number;
  theme: string;
  activities: string[];
  transport: string;
  accommodation: string;
  tips: string[];
}

export interface GuideOutline {
  title: string;
  summary: string;
  sections: GuideOutlineSection[];
}

const OutlineSchema = z.object({
  title: z.string().min(1).max(60),
  summary: z.string().min(1).max(200),
  sections: z
    .array(
      z.object({
        day: z.number().int().min(1),
        theme: z.string().min(1).max(40),
        activities: z.array(z.string().min(1)).min(1).max(6),
        transport: z.string().min(1).max(80),
        accommodation: z.string().min(1).max(80),
        tips: z.array(z.string().min(1)).min(1).max(5),
      }),
    )
    .min(1)
    .max(30),
});

// ============================================================================
// 提示词构造
// ============================================================================

function seasonText(s: TravelWizardParams['season']): string {
  return (
    {
      spring: '春季（3-5月）',
      summer: '夏季（6-8月）',
      autumn: '秋季（9-11月）',
      winter: '冬季（12-2月）',
      all: '四季皆可',
    } as const
  )[s];
}

function buildOutlinePrompt(p: TravelWizardParams): { system: string; user: string } {
  const childDesc = p.childAges.length === 0
    ? '无儿童'
    : `含儿童 ${p.childAges.join('、')} 岁`;
  const spotTypesDesc = p.spotTypes.length > 0 ? p.spotTypes.join('、') : '不限';
  const transportDesc = p.transports.length > 0 ? p.transports.join('、') : '灵活';

  const system = [
    '你是一位专业的亲子旅行规划师，擅长为有 0-12 岁孩子的中国家庭设计旅行攻略。',
    '输出必须是严格的 JSON，不要任何 markdown 包裹、不要解释、不要多余文本。',
    '语言：简体中文。',
    '原则：',
    '- 每天行程要考虑孩子的体力（每半天不超过 2 个主要活动）',
    '- 午休 12:30-14:00 强制空闲',
    '- 出行时长按用户填的天数严格生成 days 个 section',
    '- tips 必须包含至少 1 条「适合 {childAges} 岁儿童」的具体说明',
    '- 餐厅推荐要标"亲子友好"或"有无儿童椅"',
    '- title 在 20 字以内，summary 在 100 字以内',
  ].join('\n');

  const user = [
    `# 旅行信息`,
    `- 出发地：${p.fromCity || '未指定'}`,
    `- 目的地：${p.destinationCity || '未指定'}`,
    `- 出行人数：${p.travelers} 人（${childDesc}）`,
    `- 计划天数：${p.days} 天`,
    `- 出行季节：${seasonText(p.season)}`,
    `- 景点偏好：${spotTypesDesc}`,
    `- 交通方式：${transportDesc}`,
    `- 人均预算：${p.budgetPerDay} 元/天`,
    `- 住宿要求：${p.hotelPreference || '无特殊要求'}`,
    p.extraNotes ? `- 备注：${p.extraNotes}` : '',
    '',
    `# 输出要求`,
    '返回严格 JSON 对象，包含 title、summary、sections 数组。',
    'sections.length 必须等于 days，每天的 day 字段从 1 开始连续递增。',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

function buildGuidePrompt(
  p: TravelWizardParams,
  outline: GuideOutline,
): { system: string; user: string } {
  const childDesc = p.childAges.length === 0
    ? ''
    : `（含 ${p.childAges.join('、')} 岁儿童，注意体力与作息）`;

  const system = [
    '你是一位有丰富亲子旅行经验的写作者，作品发表在「童慧行走天下」平台。',
    '品牌调性：真实、温暖、实用。"孩子说好才是真的好"——优先孩子视角。',
    '语言：简体中文，亲切自然，适合家长阅读。',
    '输出格式：富文本 HTML（不要 Markdown），用 <h2>/<h3>/<p>/<ul>/<li>/<strong> 等标签。',
    '不要输出 <html>/<body>/<head> 等外层标签，只输出片段。',
  ].join('\n');

  const user = [
    `为 ${p.travelers} 位出行者${childDesc}，基于以下确认大纲生成一篇 ${p.days} 天的亲子旅行攻略。`,
    '',
    `# 大纲`,
    '```json',
    JSON.stringify(outline, null, 2),
    '```',
    '',
    `# 要求`,
    '- 字数 800-1500 字',
    '- 每天独立 <h2> 标题 + 段落 + 活动 <ul> 列表',
    '- 包含具体时间节点（如"9:00 出发"、"12:30 午餐"）',
    '- 每个活动后用 <em> 标注「适合 X 岁儿童」',
    '- 餐饮推荐要标"亲子友好"或"有宝宝椅"',
    '- 结尾附"亲子旅行小贴士" <h2> 段（防晒/安全/应急联系方式）',
    '- 适当穿插 emoji（不超过 5 个）增加亲和力',
    '',
    `出发地：${p.fromCity || '未指定'}`,
    `目的地：${p.destinationCity}`,
    `季节：${seasonText(p.season)}`,
  ].join('\n');

  return { system, user };
}

// ============================================================================
// 公开 API
// ============================================================================

/**
 * 生成行程大纲（非流式，返回结构化 JSON）
 * 复用 provider.json() + Zod schema
 */
export async function generateGuideOutline(p: TravelWizardParams): Promise<GuideOutline> {
  const provider = getProvider();
  const { system, user } = buildOutlinePrompt(p);
  return provider.json(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { schema: OutlineSchema, temperature: 0.5, maxTokens: 1500 },
  );
}

/**
 * 生成完整攻略（流式返回 HTML 片段）
 * 复用 provider.chat() 流式输出
 */
export async function* generateGuideContent(
  p: TravelWizardParams,
  outline: GuideOutline,
): AsyncGenerator<string, void, unknown> {
  const provider = getProvider();
  const { system, user } = buildGuidePrompt(p, outline);
  yield* provider.chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.7, maxTokens: 2500 },
  );
}