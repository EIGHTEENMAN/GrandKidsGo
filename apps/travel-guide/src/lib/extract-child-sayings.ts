// 孩子说自动提取：从 Guide.contentHtml 中提取引语句子
// 运行时机：发布攻略时调用的 POST /api/guides
// 默认 status='draft'，用户审核后可改为 published

/**
 * 从 HTML 正文中提取孩子说的引语句子
 * 匹配规则：
 *   1. 孩子/娃/宝宝 [说|喊|叫|问|答|告诉|喊到|说道]："[10-100 字]"
 *   2. "娃说：[10-100 字]"
 *   3. 「[10-100 字]」（语境为孩子说话时）
 *   4. （孩子说：[10-100 字]）
 * 置信度评分：1-5
 *   - 5 = 明确引号 + 说/问/答关键词
 *   - 3 = 仅引号短句（长度 10-100）
 *   - 1 = 宽松匹配
 */
export function extractChildSayingsFromHtml(html: string): Array<{ text: string; confidence: number; source: 'auto_extract'; status: 'draft' }> {
  if (!html) return [];

  const results: Array<{ text: string; confidence: number }> = [];
  const seen = new Set<string>();

  // 1. 高置信度：带"说/问/叫/答"关键词 + 引号
  const highPatterns = [
    /(?:孩子|娃|宝宝|小宝|闺女|儿子|小朋友)\s*(?:说|喊|叫|问|答|告诉|说道|喊到|吐槽|感慨)[：:：]?\s*[""「]([^"」]{10,100})[""」]/g,
    /[""「]([^"」]{10,100})[""」]\s*(?:孩子|娃|宝宝|闺女|儿子|小朋友)\s*(?:说|喊|叫|问|答)/g,
    /(?:孩子说|娃说|宝宝说)[：:：]?\s*[""「]([^"」]{10,100})[""」]/g,
  ];

  for (const re of highPatterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const text = m[1].trim();
      if (text.length >= 10 && text.length <= 100 && !seen.has(text)) {
        seen.add(text);
        results.push({ text, confidence: 5 });
      }
    }
  }

  // 2. 中置信度：括号形式（孩子说：...）
  const midPattern = /[（(][^)]{4,10}说[：:：]?\s*([^)]{10,100})[）)]/g;
  let m;
  while ((m = midPattern.exec(html)) !== null) {
    const text = m[1].trim();
    if (text.length >= 10 && text.length <= 100 && !seen.has(text)) {
      seen.add(text);
      results.push({ text, confidence: 3 });
    }
  }

  // 3. 低置信度：日文引号「」(无关键词，但长度合适)
  const lowPattern = /「([^」]{15,80})」/g;
  while ((m = lowPattern.exec(html)) !== null) {
    const text = m[1].trim();
    if (text.length >= 15 && text.length <= 80 && !seen.has(text)) {
      // 排除明显的非引语句子（全是数字、URL、标点）
      if (/[的了我是不在你有她他它]/.test(text) && /[，。！？]/.test(text)) {
        seen.add(text);
        results.push({ text, confidence: 1 });
      }
    }
  }

  // 去重 + 按置信度排序
  return results
    .filter((r, i, arr) => arr.findIndex((x) => x.text === r.text) === i)
    .sort((a, b) => b.confidence - a.confidence)
    .map((r) => ({
      text: r.text,
      confidence: r.confidence,
      source: 'auto_extract' as const,
      status: 'draft' as const,
    }));
}