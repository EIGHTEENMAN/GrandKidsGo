// AI Provider 注册表
// 通过环境变量 AI_PROVIDER 选择具体实现
// AI_PROVIDER=siliconflow | openai_compatible | mock

import type { AiProvider } from "./provider";
import type { ProviderConfig } from "./types";
import { SiliconFlowProvider } from "./siliconflow";
import { OpenAICompatibleProvider } from "./openai-compatible";
import { MockProvider } from "./mock";

let cached: AiProvider | null = null;

function readConfig(providerName: string): ProviderConfig | null {
  if (providerName === "siliconflow") {
    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) return null;
    return {
      apiKey,
      endpoint:
        process.env.SILICONFLOW_ENDPOINT ?? "https://api.siliconflow.cn/v1",
      model: process.env.SILICONFLOW_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
    };
  }
  if (providerName === "openai_compatible") {
    const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
    if (!apiKey) return null;
    return {
      apiKey,
      endpoint: process.env.OPENAI_COMPATIBLE_ENDPOINT ?? "",
      model: process.env.OPENAI_COMPATIBLE_MODEL ?? "gpt-4o-mini",
    };
  }
  return null;
}

function buildProvider(): AiProvider {
  const name = process.env.AI_PROVIDER ?? "siliconflow";
  const cfg = readConfig(name);
  if (!cfg) {
    // API key 缺失时降级到 mock，本地开发不需要真实 key
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[ai] 未找到 ${name} 的 API key，降级使用 MockProvider（仅开发模式）`,
      );
      return new MockProvider();
    }
    throw new Error(
      `[ai] 生产环境必须配置 ${name} 的 API key（见 .env.example）`,
    );
  }
  switch (name) {
    case "siliconflow":
      return new SiliconFlowProvider(cfg);
    case "openai_compatible":
      return new OpenAICompatibleProvider(cfg);
    default:
      return new SiliconFlowProvider(cfg);
  }
}

export function getProvider(): AiProvider {
  if (!cached) cached = buildProvider();
  return cached;
}

// 测试/调试用：手动重置缓存切换 provider
export function resetProviderCache(): void {
  cached = null;
}
