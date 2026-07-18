// OpenAI 兼容 Provider（OpenAI / DeepSeek / Moonshot 等）
// 详见 项目建设方案/走天下实施方案-v1.5.md 附录 E

import type { AiProvider } from "./provider";
import type {
  ChatMessage,
  ChatOptions,
  JsonOptions,
  ProviderConfig,
} from "./types";
import { SiliconFlowProvider } from "./siliconflow";

export class OpenAICompatibleProvider extends SiliconFlowProvider {
  constructor(cfg: ProviderConfig) {
    super(cfg);
    this.name = "openai_compatible";
  }
}
