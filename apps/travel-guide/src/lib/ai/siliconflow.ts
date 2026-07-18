// SiliconFlow Provider（DeepSeek/Qwen 等国产模型都走 OpenAI 兼容协议）
// 详见 项目建设方案/走天下实施方案-v1.5.md 附录 E

import type { AiProvider } from "./provider";
import type {
  ChatMessage,
  ChatOptions,
  JsonOptions,
  ProviderConfig,
} from "./types";

interface SseEvent {
  event?: string;
  data?: string;
}

function parseSseChunks(raw: string): string[] {
  const out: string[] = [];
  for (const block of raw.split("\n\n")) {
    if (!block.trim()) continue;
    const ev: SseEvent = {};
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) ev.event = line.slice(6).trim();
      else if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        ev.data = data;
      }
    }
    if (!ev.data) continue;
    try {
      const json = JSON.parse(ev.data);
      const delta = json?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) out.push(delta);
    } catch {
      // 忽略非 JSON 数据，常见于心跳帧
    }
  }
  return out;
}

export class SiliconFlowProvider implements AiProvider {
  name: string;
  protected cfg: ProviderConfig;

  constructor(cfg: ProviderConfig) {
    this.cfg = cfg;
    this.name = "siliconflow";
  }

  async *chat(
    messages: ChatMessage[],
    opts: ChatOptions = {},
  ): AsyncIterable<string> {
    const res = await fetch(`${this.cfg.endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model ?? this.cfg.model,
        messages,
        stream: true,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens,
        signal: opts.signal,
      }),
      signal: opts.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(
        `SiliconFlow chat ${res.status}: ${await res.text().catch(() => "")}`,
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      const chunks = parseSseChunks(lines.join("\n") + "\n\n");
      for (const c of chunks) yield c;
    }
    if (buffer.trim()) {
      for (const c of parseSseChunks(buffer + "\n\n")) yield c;
    }
  }

  async json<T>(messages: ChatMessage[], opts: JsonOptions): Promise<T> {
    const schemaJson = JSON.stringify(opts.schema._def, null, 2);
    const systemHint: ChatMessage = {
      role: "system",
      content:
        "你必须只返回一个严格符合以下 JSON Schema 的 JSON 对象，" +
        "不要包裹 markdown、不要解释、不要多余文本。\n\nSchema:\n" +
        schemaJson,
    };
    let raw = "";
    for await (const chunk of this.chat([systemHint, ...messages], {
      model: opts.model,
      temperature: opts.temperature ?? 0.2,
      maxTokens: opts.maxTokens,
      signal: opts.signal,
    })) {
      raw += chunk;
    }
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`SiliconFlow json: 无 JSON 输出\n原始:${raw.slice(0, 200)}`);
    }
    const candidate = raw.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(candidate);
    return opts.schema.parse(parsed) as T;
  }
}
