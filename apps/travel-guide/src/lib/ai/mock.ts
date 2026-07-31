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
      return `${spotName}（AI 起草 v1，占位）孩子亮点需由 KOL 家长复评，建议先带孩子实地探访一次再下结论。`;
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

    // AI 攻略向导场景：识别"出行"上下文 → 返回 Outline 形状
    const isTravelWizard = /亲子旅行规划师|旅行大纲|攻略向导|亲子旅行攻略/i.test(joined);
    if (isTravelWizard) {
      const destMatch = joined.match(/目的地[：:]\s*([^\n]+)/);
      const daysMatch = joined.match(/计划天数[：:]\s*(\d+)\s*天/);
      const days = daysMatch ? Math.min(Math.max(parseInt(daysMatch[1], 10), 1), 7) : 3;
      const destination = destMatch ? destMatch[1].trim() : "目的地";
      const stub = {
        title: `${destination}${days}日亲子游攻略（AI 起草 v1，占位）`,
        summary: `这是一份由 AI 起草的占位攻略大纲。配置 SILICONFLOW_API_KEY 后将生成真实内容。当前 Mock 模式用于本地开发。`,
        sections: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          theme: `第 ${i + 1} 天主题（占位）`,
          activities: [
            `上午：探索 ${destination} 的热门景点`,
            `下午：亲子互动活动`,
          ],
          transport: "建议打车或公共交通（占位）",
          accommodation: "亲子酒店或民宿（占位）",
          tips: [
            `适合 3-12 岁儿童`,
            `记得带防晒和替换衣物`,
          ],
        })),
      };
      return opts.schema.parse(stub) as T;
    }

    // 默认 Guardian schema（02-ai-enrich 用）
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
