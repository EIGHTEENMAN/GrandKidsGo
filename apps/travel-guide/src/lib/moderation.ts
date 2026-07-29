// 走天下审核模块（v1.0 — 攻略体系 PR1）
// 纯本地敏感词 DFA，避免任何外部依赖。
// 审核分两阶段（PR1 决策钉死）：
//   - hard 命中（合规红线） → 直接 rejected
//   - soft 命中（疑似问题） → pending_review（人工二次确认）
//   - 都未命中               → published（v1.0：手动 / from-plan 都过 DFA 后直发，作者侧可撤回 D6）
//
// hard/soft 拆分见 SENSITIVE_WORDS_HARD / SENSITIVE_WORDS_SOFT 数组。
// 手机号/身份证 11/18 位数字模式归 hard（高敏感 PII）。
// 内容超长归 soft（可能是粘贴错但不像攻击）。

import { PrismaClient } from "@prisma/client";
import type { GuideStatus } from "./guide-status";

const prisma = new PrismaClient();

// 合规红线：硬拒（v1.4 第十五节 B 隐私 + 法条基线）
const SENSITIVE_WORDS_HARD: string[] = [
  // 暴力 / 危险
  "暴力", "杀人", "死亡", "自杀", "自残", "跳楼", "吸毒", "贩毒",
  // 极端 / 邪教
  "恐怖", "恐怖分子", "极端组织", "邪教",
  // 个人识别（v1.4 第十五节 B 孩子信息保护硬合规）
  "孩子身份证", "孩子身份证号", "宝宝身份证",
];

// 疑似问题：soft（人工二次确认，不直接拒）
// v1.0 暂保留色情 / 歧视类关键词为 soft——它们经常出现在讨论、避雷贴里，
// 让 admin 复核而非机审一刀切。
const SENSITIVE_WORDS_SOFT: string[] = [
  // 色情（讨论"远离色情内容"是合理语境）
  "色情", "裸", "性行为", "淫", "成人内容",
  // 歧视 / 侮辱儿童（v1.4 第十五节 B 重点，但避雷贴也可能引用）
  "白痴", "笨蛋", "蠢货", "去死", "傻子", "脑残", "智障",
  // 赌博 / 烟酒（讨论"避免赌场"是合理亲子语境）
  "赌博", "赌场", "赌球", "香烟", "酗酒",
];

// 手机号 / 身份证 → hard（明确 PII 暴露）
const PII_PATTERNS: RegExp[] = [
  /1[3-9]\d{9}/,                          // 手机号
  /\d{17}[\dXx]/,                         // 身份证
];

export type SensitivityLevel = "hard" | "soft" | "clean";

export interface ModerationResult {
  passed: boolean;          // true 表示可以 published（hard 阻 + soft 都没阻）
  reasons: string[];        // 触发的所有理由（hard+soft 都列出来便于人工看）
  hardRejection: boolean;   // true → status=rejected
  softPending: boolean;     // true → status=pending_review（人工二次）
  nextStatus: GuideStatus;  // 直接给下游用，省一次判断
  sensitivity: SensitivityLevel;
}

/**
 * 把 (hard|soft|clean) 翻译成下游可写的 status。
 */
export function nextStatusFromModeration(r: Pick<ModerationResult, "hardRejection" | "softPending">): GuideStatus {
  if (r.hardRejection) return "rejected";
  if (r.softPending) return "pending_review";
  return "published";
}

/**
 * 仅文本审核（不写库）。
 * 公开导出，供 PR2 的 /api/guides POST + /api/guides/from-plan 共用。
 */
export function moderateTravelText(text: string): ModerationResult {
  const reasons: string[] = [];
  let hard = false;
  let soft = false;

  for (const word of SENSITIVE_WORDS_HARD) {
    if (text.includes(word)) {
      reasons.push(`[hard] 包含敏感词：${word}`);
      hard = true;
    }
  }
  for (const word of SENSITIVE_WORDS_SOFT) {
    if (text.includes(word)) {
      reasons.push(`[soft] 包含敏感词：${word}`);
      soft = true;
    }
  }
  for (const re of PII_PATTERNS) {
    if (re.test(text)) {
      reasons.push(`[hard] 命中个人信息模式：${re.source}`);
      hard = true;
    }
  }

  // 长度上限：soft（异常粘贴但不像攻击）
  if (text.length > 5000) {
    reasons.push(`[soft] 内容超过 5000 字（当前 ${text.length}）`);
    soft = true;
  }

  const sensitivity: SensitivityLevel = hard ? "hard" : soft ? "soft" : "clean";

  const result: ModerationResult = {
    passed: !hard && !soft,
    reasons,
    hardRejection: hard,
    softPending: soft,
    nextStatus: "draft", // 立刻覆盖
    sensitivity,
  };
  result.nextStatus = nextStatusFromModeration(result);
  return result;
}

/**
 * 审核入口（PR1 向后兼容）：
 * - hard → status=rejected
 * - soft → status=pending_review
 * - clean → status=published（v1.0 决策；作者侧仍可撤回 D6）
 *
 * 注意：reviewGuide 仅做审核 + status 写入。
 * 埋点 / 操作日志由调用方（PR2 的 /api/guides POST + from-plan）各自负责。
 */
export async function reviewGuide(params: {
  guideId: string;
  text: string;
}): Promise<ModerationResult> {
  const result = moderateTravelText(params.text);

  await prisma.guide.update({
    where: { id: params.guideId },
    data: {
      status: result.nextStatus,
      updatedAt: new Date(),
    },
  });

  return result;
}