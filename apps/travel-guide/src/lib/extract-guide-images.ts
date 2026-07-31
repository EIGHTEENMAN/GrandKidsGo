/**
 * 从攻略正文 HTML 中提取 img 标签 → 自动录入儿童画廊
 *
 * 与 extract-child-sayings.ts 对称：发布攻略时一并提取正文中的图片。
 */

export interface ExtractedImage {
  ossUrl: string;
  ossKey: string;
  caption: string | null;   // img alt 文本
  title: string | null;     // img title 属性
}

/** 从 HTML 字符串中提取所有 <img> 标签的 src/alt */
export function extractImagesFromHtml(html: string): ExtractedImage[] {
  const seen = new Set<string>();
  const results: ExtractedImage[] = [];

  // 匹配 <img ... /> 自闭合 或 <img ... > 无闭合
  const imgRegex = /<img\b[^>]*?>/gi;
  const srcRegex  = /\bsrc\s*=\s*"([^"]*)"/i;
  const altRegex  = /\balt\s*=\s*"([^"]*)"/i;
  const titleRegex = /\btitle\s*=\s*"([^"]*)"/i;

  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];

    const srcM = srcRegex.exec(tag);
    if (!srcM) continue;

    const rawSrc = srcM[1].trim();
    if (!rawSrc) continue;

    // 跳过 data: URI / blob: / 相对路径
    if (rawSrc.startsWith('data:') || rawSrc.startsWith('blob:') || rawSrc.startsWith('/')) continue;

    // 通过 src 去重（同一张图只提取一次）
    if (seen.has(rawSrc)) continue;
    seen.add(rawSrc);

    const altM = altRegex.exec(tag);
    const titleM = titleRegex.exec(tag);

    results.push({
      ossUrl: rawSrc,
      ossKey: extractOssKey(rawSrc),
      caption: altM?.[1]?.trim() || null,
      title: titleM?.[1]?.trim() || null,
    });
  }

  return results;
}

/**
 * 从 OSS URL 中提取 ossKey。
 *
 * OSS URL 格式示例：
 *   https://bucket.oss-cn-beijing.aliyuncs.com/uploads/2024/abc.jpg
 *   → ossKey = "uploads/2024/abc.jpg"
 */
function extractOssKey(url: string): string {
  try {
    const u = new URL(url);
    // 去除开头的 /
    let key = u.pathname.replace(/^\//, '');
    // 如果 pathname 为空则 fallback 到整个 url
    if (!key) key = url;
    return key;
  } catch {
    // 非标准 URL（如纯 ossKey），直接返回
    return url;
  }
}
