// 冒烟测试：Mock + SiliconFlow 双 provider 端到端走通
// 运行：npx tsx src/lib/ai/__smoke__.ts

import { z } from "zod";
import { getProvider } from "./registry";
import type { AiProvider } from "./provider";

async function streamDemo(provider: AiProvider, label: string) {
  const messages = [
    {
      role: "system" as const,
      content: "你是走天下的 AI 助手，负责帮妈妈起草亲子景点的护城河文案。",
    },
    { role: "user" as const, content: "景点：北京自然博物馆" },
  ];
  const buf: string[] = [];
  for await (const chunk of provider.chat(messages, { maxTokens: 200 })) {
    buf.push(chunk);
  }
  const text = buf.join("");
  console.log(`[${label} chat] ${text.slice(0, 120)}${text.length > 120 ? "..." : ""}`);
  console.log(`[${label} chat] chunks=${buf.length}, length=${text.length}`);
}

async function jsonDemo(provider: AiProvider, label: string) {
  const schema = z.object({
    kidHook: z.string(),
    momHook: z.string(),
    dadHook: z.string(),
    kidHighlights: z.array(z.string()),
    tips: z.array(z.string()),
    pitfalls: z.array(z.string()),
    dataSource: z.string(),
  });
  const result = await provider.json(
    [
      {
        role: "system",
        content: "你是走天下的 AI 助手，负责起草景点描述。返回严格 JSON。",
      },
      { role: "user", content: "景点：北京动物园" },
    ],
    { schema, maxTokens: 400 },
  );
  console.log(`[${label} json]`, JSON.stringify(result, null, 2));
}

async function run() {
  process.env.AI_PROVIDER = "mock";
  process.env.SILICONFLOW_API_KEY = "";
  const { resetProviderCache } = await import("./registry");
  resetProviderCache();
  const mock = getProvider();
  console.log("--- Mock Provider ---");
  await streamDemo(mock, "mock");
  await jsonDemo(mock, "mock");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
