// AiProvider 接口定义
// 详见 项目建设方案/走天下实施方案-v1.5.md 附录 E 三

import type { ChatMessage, ChatOptions, JsonOptions } from "./types";

export interface AiProvider {
  name: string;

  /**
   * 流式对话，返回文本迭代器。
   * 用于攻略润色等需要边出边看的场景。
   */
  chat(messages: ChatMessage[], opts?: ChatOptions): AsyncIterable<string>;

  /**
   * 结构化输出，按 schema 校验后返回。
   * 用于 AI 起草 kidHook / 行程智能问答的问答等需要可程序化处理的场景。
   */
  json<T>(messages: ChatMessage[], opts: JsonOptions): Promise<T>;
}
