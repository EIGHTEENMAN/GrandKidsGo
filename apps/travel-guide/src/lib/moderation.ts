// 儿童友好内容审核模块
// 关键词过滤 + 自动标记敏感内容

const SENSITIVE_WORDS = [
  "暴力", "杀人", "死亡", "自杀", "自残", "跳楼", "吸毒", "贩毒",
  "色情", "裸", "性", "淫", "成人",
  "白痴", "笨蛋", "蠢货", "去死", "滚蛋", "傻子", "脑残",
  "赌博", "赌场", "赌",
  "香烟", "抽烟", "喝酒", "酗酒",
  "恐怖", "恐怖分子", "极端", "邪教",
];

const SENSITIVE_PATTERNS = [
  /1[3-9]\d{9}/g,
  /\d{17}[\dXx]/g,
  /https?:\/\/[^\s]+/g,
];

export interface ModerationResult {
  isApproved: boolean;
  reason: string | null;
  flags: string[];
}

export function moderateText(text: string): ModerationResult {
  const flags: string[] = [];

  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) {
      flags.push(`包含敏感词: ${word}`);
    }
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      flags.push(`包含敏感信息: ${matches[0].substring(0, 8)}...`);
    }
  }

  return {
    isApproved: flags.length === 0,
    reason: flags.length > 0 ? flags.join("; ") : null,
    flags,
  };
}

export type ContentType = "comment" | "kid_say" | "checkin_note" | "gallery_caption";

export async function reviewContent(
  prisma: any,
  contentType: ContentType,
  content: string,
  contentId?: string,
): Promise<ModerationResult> {
  const result = moderateText(content);

  await prisma.contentReview.create({
    data: {
      contentType,
      contentId: contentId || null,
      content: content.substring(0, 500),
      reason: result.reason,
      status: result.isApproved ? "approved" : "pending",
    },
  });

  return result;
}
