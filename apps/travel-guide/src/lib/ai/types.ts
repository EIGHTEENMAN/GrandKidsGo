// AI Provider 公共类型
// 详见 项目建设方案/走天下实施方案-v1.5.md 附录 E

import type { ZodSchema } from "zod";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface JsonOptions extends ChatOptions {
  schema: ZodSchema<any>;
}

export interface ProviderConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}
