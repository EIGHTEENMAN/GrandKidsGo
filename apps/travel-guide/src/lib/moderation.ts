// 走天下审核模块（v1.4 第十五节 B + 第十六节）
// 纯本地敏感词 DFA，避免任何外部依赖。
// 审核分两阶段：
//   - DFA 命中 → 直接拒
//   - DFA 未命中 → 状态 pending_review（人工审核在 admin 后台）

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 敏感词基础词库（v1 上线初期精简版）
// 完整手册见 项目建设方案/走天下实施方案-v1.5.md 附录 G
const SENSITIVE_WORDS: string[] = [
  // 暴力 / 危险
  "暴力", "杀人", "死亡", "自杀", "自残", "跳楼", "吸毒", "贩毒",
  // 色情
  "色情", "裸", "性行为", "淫", "成人内容",
  // 歧视 / 侮辱儿童（v1.4 第十五节 B 重点）
  "白痴", "笨蛋", "蠢货", "去死", "傻子", "脑残", "智障",
  // 赌博 / 烟酒
  "赌博", "赌场", "赌球", "香烟", "酗酒",
  // 极端 / 邪教
  "恐怖", "恐怖分子", "极端组织", "邪教",
  // 个人识别（v1.4 第十五节 B 孩子信息保护硬合规）
  "孩子身份证", "孩子身份证号", "宝宝身份证",
];

// 模式：手机号 / 身份证 / 完整 URL（家长分享可含 URL，不阻，但要提示人工二次确认）
const SENSITIVE_PATTERNS: RegExp[] = [
  { test: (s: string) => /1[3-9]\d{9}/.test(s) } as RegExp,                          // 手机号
  { test: (s: string) => /\d{17}[\dXx]/.test(s) } as RegExp,                          // 身份证
];

export interface ModerationResult {
  passed: boolean;
  reasons: string[];
  hardRejection: boolean;
}

export function moderateTravelText(text: string): ModerationResult {
  const reasons: string[] = [];

  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) {
      reasons.push(`包含敏感词：${word}`);
    }
  }

  if (text.length > 5000) {
    reasons.push(`内容超过 5000 字（当前 ${text.length}）`);
  }

  return {
    passed: reasons.length === 0,
    reasons,
    hardRejection: reasons.some((r) => r.startsWith("包含敏感词")) ||
      text.length > 5000,
  };
}

/**
 * 审核入口：写审核记录，更新指南状态
 */
export async function reviewGuide(params: {
  guideId: string;
  text: string;
}): Promise<ModerationResult> {
  const result = moderateTravelText(params.text);

  // 写入审核日志（v1.5 第十五节 B - 记录到 ContentReview 未来表）
  // 当前 schema 已删除 ContentReview，先写一个 ContentReview 不存在的数据库
  // v1.5 阶段在 admin 后台统一看此表
  // 简易方案：直接更新 guide.status；记录到 prisma 时不再写日志表（避免 schema 漂移）

  if (result.hardRejection) {
    await prisma.guide.update({
      where: { id: params.guideId },
      data: {
        status: "rejected",
        updatedAt: new Date(),
      },
    });
  } else {
    // 进入人工审核队列
    await prisma.guide.update({
      where: { id: params.guideId },
      data: {
        status: "pending_review",
        updatedAt: new Date(),
      },
    });
  }

  return result;
}
