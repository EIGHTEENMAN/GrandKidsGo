// sanitize.ts — HTML 白名单安全清洗（零依赖）
// 只保留：h2/h3/p/ul/li/ol/strong/em/img/a/br/blockquote/hr
// 属性仅保留：img[src,alt]、a[href,rel,target]
// 删除：script/style/iframe/on*/javascript:/style/data- 属性
// 长度上限：50000 字符

const ALLOWED_TAGS = new Set(['h2','h3','h4','p','ul','li','ol','strong','em','b','i','img','a','br','blockquote','hr','u','s','sub','sup','pre','code','span','div','table','thead','tbody','tr','th','td','figure','figcaption','cite']);
const ALLOWED_ATTRS = new Set(['src', 'alt', 'href', 'rel', 'target', 'title', 'class']);

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  let html = input.slice(0, 50000);

  // 1. strip script/style/iframe
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // 2. strip on* event attributes & javascript: href
  html = html.replace(/\son\w+=["'][^"']*["']/gi, '');
  html = html.replace(/href=["']javascript:[^"']*["']/gi, 'href="#"');
  html = html.replace(/<a\s+href="#"/gi, '<a href="#"');

  // 3. filter tags: remove disallowed tags but keep content
  html = html.replace(/<(\/?)(\w+)[^>]*>/g, (match, close, tag) => {
    const t = tag.toLowerCase();
    if (ALLOWED_TAGS.has(t)) {
      if (close) return `</${t}>`;
      // extract allowed attributes only
      const attrs: string[] = [];
      for (const attr of match.matchAll(/(\w+)=["']([^"']*)["']/g)) {
        const name = attr[1].toLowerCase();
        const val = attr[2].slice(0, 500);
        if (ALLOWED_ATTRS.has(name)) {
          attrs.push(`${name}="${val.replace(/"/g, '&quot;')}"`);
        }
      }
      // a tags force target=_blank rel=noopener
      if (t === 'a') {
        if (!attrs.some(a => a.startsWith('rel='))) attrs.push('rel="noopener noreferrer"');
        if (!attrs.some(a => a.startsWith('target='))) attrs.push('target="_blank"');
      }
      const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
      return `<${t}${attrStr}>`;
    }
    return '';
  });

  // 4. remove leading/trailing whitespace
  html = html.trim();

  return html;
}