// 攻略状态机（v1.0 — 攻略体系 D3 决策钉死）
// 5 状态 union：draft / pending_review / published / rejected / archived
// 任何数据库读 / 写 / UI 渲染都走这里，禁止散写字符串。

export const GUIDE_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "archived",
] as const;

export type GuideStatus = (typeof GUIDE_STATUSES)[number];

/**
 * 中性 label（个人中心/详情页/列表项使用）。
 * 不带颜色，颜色由组件决定。
 */
export const GUIDE_STATUS_LABEL: Record<GuideStatus, string> = {
  draft: "草稿",
  pending_review: "审核中",
  published: "已发布",
  rejected: "未通过",
  archived: "已归档",
};

/**
 * 公开 feed 允许出现哪些状态。
 * 当前仅 published；rejected / archived / pending_review / draft 都不应出现在 /guides 首页 / 搜索 / 关联推荐。
 */
export const PUBLIC_VISIBLE_STATUSES: GuideStatus[] = ["published"];

/**
 * 「我的攻略」tab 分类（与个人中心 UI 对齐）。
 * - drafts: 未发布（草稿 + 退回 + 审核中）
 * - published: 已发布
 * - archived: 已归档
 * - all: 全部
 */
export type MineTab = "drafts" | "published" | "archived" | "all";

/**
 * 把 tab 映射到 status IN [] 过滤条件。
 * drafts tab 不区分原因（草稿 / 审核中 / 退回 都是"还没发出去"）。
 */
export function statusInForTab(tab: MineTab): GuideStatus[] {
  switch (tab) {
    case "drafts":
      return ["draft", "pending_review", "rejected"];
    case "published":
      return ["published"];
    case "archived":
      return ["archived"];
    case "all":
      return [...GUIDE_STATUSES];
  }
}

/**
 * 状态转换合法性校验（攻略体系 v1.0）。
 * - draft → pending_review（提交审核）
 * - pending_review → published（人工通过）/ rejected（人工拒绝）
 * - rejected → pending_review（修改重提；D4）
 * - published → draft（作者撤回编辑；D6）
 * - published → archived（作者归档）
 * - archived → published（作者恢复）
 *
 * 任何不存在的边都返回 false；调用方应返回 409。
 */
const TRANSITIONS: Record<GuideStatus, GuideStatus[]> = {
  draft: ["pending_review", "archived"],
  // pending_review: published（人工放行）/ rejected（人工拒）/ draft（作者撤回编辑 — P0 感知）
  pending_review: ["published", "rejected", "draft"],
  published: ["draft", "archived"],
  rejected: ["pending_review", "archived"],
  archived: ["published", "draft"],
};

export function canTransition(from: GuideStatus, to: GuideStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 兼容历史脏数据：数据库可能残留 `pending` 字符串（v1 旧版写法）。
 * 一律按 pending_review 处理。
 */
export function normalizeStatus(input: string | null | undefined): GuideStatus {
  if (!input) return "draft";
  if (input === "pending") return "pending_review";
  if ((GUIDE_STATUSES as readonly string[]).includes(input)) {
    return input as GuideStatus;
  }
  // 兜底：未知字符串一律当草稿，避免下游逻辑 crash
  return "draft";
}

/**
 * 是否需要作者侧按钮「撤回 / 编辑 / 归档 / 重新发布 / 提交审核」。
 * 仅 published / rejected / archived / pending_review 命中。
 * draft 由 TipTap 自动保存器处理，不在这里。
 */
export function isAuthorActionable(status: GuideStatus): boolean {
  return ["published", "rejected", "archived", "pending_review"].includes(status);
}