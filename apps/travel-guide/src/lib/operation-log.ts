// 操作日志中间件（Wave B 数据资产持久化的硬基线）
// 所有"修改类"操作必须经过此函数写 OperationLog，不可绕过。
// OperationLog 是 append-only，无 update/delete 路径。

import type { PrismaClient, OperationLog as PrismaOpLog } from "@prisma/client";

type Action =
  | "guide_publish"
  | "guide_approve"
  | "guide_reject"
  | "guide_withdraw"
  | "consent_grant"
  | "consent_revoke"
  | "rating_create"
  | "plan_create"
  | "plan_complete"
  | "retraction_cascade"
  | "snapshot_create"
  | "snapshot_download"
  | "retraction_complete";

interface LogInput {
  actorId: string;
  actorRole?: "user" | "admin" | "system" | "moderation_job";
  action: Action;
  targetType: "guide" | "plan" | "consent" | "retraction" | "snapshot" | "media" | "rating";
  targetId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 懒加载 prisma client。
 * Next dev 中静态顶层 import PrismaClient 时
 *   1) webpack 重新打包后 globalThis 单例可能不同步
 *   2) PrismaClient 构造失败（DATABASE_URL 不存在等）
 * 这里改成"每次调用时实时 import"避开这些隐患。
 */
async function getClient(): Promise<PrismaClient> {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient();
}

export async function recordOperation(input: LogInput): Promise<string> {
  const client = await getClient();
  const log = await client.operationLog.create({
    data: {
      actorId: input.actorId,
      actorRole: input.actorRole ?? "user",
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      beforeJson: (input.before as any) ?? undefined,
      afterJson: (input.after as any) ?? undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    select: { id: true },
  });
  await client.$disconnect();
  return log.id;
}

export async function isAbnormalFrequency(
  actorId: string,
  action: Action,
  windowMinutes: number,
  threshold: number,
): Promise<boolean> {
  const client = await getClient();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const count = await client.operationLog.count({
    where: { actorId, action, createdAt: { gte: since } },
  });
  await client.$disconnect();
  return count >= threshold;
}
