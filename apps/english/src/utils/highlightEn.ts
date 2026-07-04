/**
 * 把文本中的英文单词用 <em class="en"> 包裹，方便 UI 高亮
 * 注意：必须避免破坏已有的 HTML 标签
 */

const EN_RE = /\b([a-zA-Z][a-zA-Z'\-]*[a-zA-Z]|[a-zA-Z])\b/g

/**
 * 安全地将英文单词高亮
 * @param text 原始文本（可能是 AI 流式返回的不完整内容）
 * @returns HTML 字符串
 */
export function highlightEn(text: string): string {
  // 先 escape HTML 防止 XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // 把换行转成 <br/>
  escaped = escaped.replace(/\n/g, '<br/>')
  // 高亮英文单词
  return escaped.replace(EN_RE, '<em class="en">$1</em>')
}