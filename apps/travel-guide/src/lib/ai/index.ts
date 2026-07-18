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
