// Mock Provider
// 用于 v1 上线期 SILICONFLOW_API_KEY 为空的场景：
// - chat 流式输出"假装 AI 起草"的占位文案
// - json 输出 schema shape 的最小可识别对象

import type { AiProvider } from "./provider";
import type { ChatMessage, ChatOptions, JsonOptions } from "./types";

const MOCK_LATENCY_MS = 80;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isGuardianPrompt(messages: ChatMessage[]): boolean {
  const txt = messages.map((m) => m.content).join("\n");
  return /护城河|kid_?hook|kid_?highlights|pitfalls|景点|餐厅|酒店/i.test(txt);
}

function mockGuardianText(spotName: string, kind: "spot" | "restaurant" | "hotel" | "park"): string {
  switch (kind) {
    case "spot":
      return `${spotName}（AI 起草 v1，占位）孩子亮点需由 KOL 妈妈复评，建议先带孩子实地探访一次再下结论。`;
    case "restaurant":
      return `${spotName}（AI 起草 v1，占位）是否有儿童餐椅建议现场确认；菜品辣度可提前电话询问。`;
    case "hotel":
      return `${spotName}（AI 起草 v1，占位）亲子房与儿童早餐建议预订前致电酒店确认房型与时段。`;
    case "park":
      return `${spotName}（AI 起草 v1，占位）户外场所请提前查天气，给孩子备好防晒与替换衣。`;
  }
}

function detectKind(name: string): "spot" | "restaurant" | "hotel" | "park" {
  if (/餐厅|面馆|食堂|小吃|酒楼|饭店|料理|餐厅/.test(name)) return "restaurant";
  if (/酒店|宾馆|民宿|客栈|度假村/.test(name)) return "hotel";
  if (/公园|花园|广场|绿地/.test(name)) return "park";
  return "spot";
}

export class MockProvider implements AiProvider {
  readonly name = "mock";

  async *chat(
    messages: ChatMessage[],
    opts: ChatOptions = {},
  ): AsyncIterable<string> {
    await delay(MOCK_LATENCY_MS);
    const joined = messages.map((m) => m.content).join("\n");
    const spotMatch = joined.match(/景点[:：]\s*([^\n]+)/);
    const spotName = spotMatch ? spotMatch[1].trim().split(/[,，。\s]/)[0] : "该地点";
    const kind = isGuardianPrompt(messages)
      ? detectKind(spotName)
      : "spot";
    const text = mockGuardianText(spotName, kind);
    for (const ch of text) {
      await delay(8);
      yield ch;
    }
    void opts;
  }

  async json<T>(messages: ChatMessage[], opts: JsonOptions): Promise<T> {
    await delay(MOCK_LATENCY_MS);
    const joined = messages.map((m) => m.content).join("\n");
    const spotMatch = joined.match(/景点[:：]\s*([^\n]+)/);
    const spotName = spotMatch ? spotMatch[1].trim().split(/[,，。\s]/)[0] : "该地点";
    const kind = detectKind(spotName);
    const stub = {
      kidHook: mockGuardianText(spotName, kind),
      momHook: `适合妈妈拍照打卡的 ${spotName}`,
      dadHook: `${spotName} 体力消耗中等`,
      kidHighlights: [`${spotName} 有适合 ${spotName} 主题的互动体验`],
      tips: ["建议提前预约，避免周末人流高峰"],
      pitfalls: ["馆内餐饮选择有限，可自带零食与水杯"],
      dataSource: "ai_draft_v1",
    };
    return opts.schema.parse(stub) as T;
  }
}
