// 语音转写（ASR）helper
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十五节（儿童音频合规）
//
// 当前策略：
//   - 有 ALIYUN_OSS_ACCESS_KEY_ID + ALIYUN_OSS_ACCESS_KEY_SECRET → 调阿里云一句话识别 RESTful API
//   - 否则降级：返回空字符串，提示用户手动填 text（审核仍然可以基于手动文本走）
//
// 依赖：aliyun-oss / aliyun-sdk 暂未装，先用 fetch + 阿里云 NLS REST API
// 如未来需要更精准的儿童语音识别，可以切换到腾讯云 ASR / 讯飞

interface AsrResult {
  text: string;
  confidence?: number;
  engine: "aliyun" | "fallback" | "empty";
}

const NLS_APP_KEY = process.env.ALIYUN_NLS_APP_KEY;
const NLS_TOKEN = process.env.ALIYUN_NLS_TOKEN;

export async function transcribeAudio(filePath: string, mime: string): Promise<AsrResult> {
  // 阻塞时降级：返回空文本，前端会让家长手动填
  if (!NLS_APP_KEY || !NLS_TOKEN) {
    console.warn("[voice-asr] ALIYUN_NLS_APP_KEY/TOKEN 未配置，降级为人工填文本");
    return { text: "", engine: "fallback" };
  }

  try {
    // 阿里云一句话识别 RESTful API（短音频 ≤ 60s）
    // 文档：https://help.aliyun.com/zh/isi/getting-started/restful-api-for-short-audio-recognition
    const { promises: fs } = await import("node:fs");
    const audioBuffer = await fs.readFile(filePath);
    const base64Audio = audioBuffer.toString("base64");

    const res = await fetch("https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NLS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appkey: NLS_APP_KEY,
        format: mime.includes("webm") ? "opus" : mime.includes("mp4") ? "m4a" : "pcm",
        sample_rate: 16000,
        enable_punctuation_prediction: true,
        enable_inverse_text_normalization: true,
        speech: base64Audio,
      }),
    });

    if (!res.ok) {
      console.error("[voice-asr] aliyun NLS failed", res.status);
      return { text: "", engine: "fallback" };
    }

    const json = (await res.json()) as { Result?: { Sentences?: Array<{ Text: string; ChannelId?: number }> } };
    const text = json.Result?.Sentences?.[0]?.Text ?? "";
    return { text, engine: text ? "aliyun" : "empty" };
  } catch (e) {
    console.error("[voice-asr] exception", e);
    return { text: "", engine: "fallback" };
  }
}