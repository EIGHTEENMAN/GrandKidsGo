// AI 抽象层顶层导出
// 调用方永远 import from "@/lib/ai" 而不是具体 provider

export { getProvider, resetProviderCache } from "./registry";
export type { AiProvider } from "./provider";
export type {
  ChatMessage,
  ChatOptions,
  ChatRole,
  JsonOptions,
  ProviderConfig,
} from "./types";

// AI 攻略向导高层函数（2026-07-31）
export {
  generateGuideOutline,
  generateGuideContent,
} from "./travel-wizard";
export type {
  TravelWizardParams,
  GuideOutline,
  GuideOutlineSection,
} from "./travel-wizard";
