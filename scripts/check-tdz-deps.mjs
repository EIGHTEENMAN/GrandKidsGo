/**
 * TDZ 依赖数组检测器
 *
 * 找出 React 组件中 useEffect/useMemo/useCallback 的依赖数组引用了
 * 「在该 hook 调用之后才声明」的 const/let 变量 —— 这会导致渲染时抛
 * "Cannot access 'X' before initialization" ReferenceError。
 *
 * 检测原理：
 *   1. 逐文件按行扫描，找到所有 hook 调用（含跨行的调用）
 *   2. 对每个 hook，取其依赖数组（第二个参数）
 *   3. 收集文件中所有 `const X =` / `let X =` 的声明行号
 *   4. 若依赖数组里的标识符声明行号 > hook 调用行号 → 报告
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.argv[2] || 'apps';
const EXCLUDE = new Set(['node_modules', 'dist', '.next', 'build', '.git', 'coverage', 'out', '.nuxt']);

const HOOKS = ['useEffect', 'useMemo', 'useCallback', 'useLayoutEffect'];

// 递归收集源文件
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

// 找到 hook 调用及其依赖数组：返回 {hook, callLine, deps:[], depsLine}
function findHooks(src) {
  const res = [];
  for (const hook of HOOKS) {
    const re = new RegExp(`\\b${hook}\\s*\\(`, 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      const callLine = src.slice(0, m.index).split('\n').length;
      // 从 '(' 开始做括号配对，找到第二个顶层参数（依赖数组）
      let i = m.index + m[0].length - 1;
      let depth = 0, argStart = -1, argEnd = -1, argCount = 0;
      for (; i < src.length; i++) {
        const c = src[i];
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') {
          depth--;
          if (depth === 0) {
            if (argCount === 1) { argEnd = i; break; }
            argCount++; argStart = -1;
          }
        } else if (c === ',' && depth === 1) {
          argCount++; argStart = i + 1;
        }
      }
      if (argEnd > 0 && argStart > 0) {
        const depsStr = src.slice(argStart, argEnd);
        const depsLine = src.slice(0, argStart).split('\n').length;
        // 提取顶层标识符
        const deps = [...depsStr.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)].map(x => x[0]);
        res.push({ hook, callLine, deps, depsLine, depsStr: depsStr.trim() });
      }
    }
  }
  return res;
}

// 收集变量声明行号
function collectDecls(src) {
  const decls = new Map();
  const lines = src.split('\n');
  lines.forEach((ln, i) => {
    const m = ln.match(/^\s*(?:export\s+)?(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/);
    if (m) {
      if (!decls.has(m[1])) decls.set(m[1], []);
      decls.get(m[1]).push(i + 1);
    }
    // 解构：const { a, b } = ...
    const d = ln.match(/^\s*(?:export\s+)?(?:const|let)\s*\{([^}]*)\}\s*=/);
    if (d) {
      for (const part of d[1].split(',')) {
        const name = part.split(':').pop().split('=')[0].trim();
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
          if (!decls.has(name)) decls.set(name, []);
          decls.get(name).push(i + 1);
        }
      }
    }
    // 解构：const [a, b] = ...   ← React useState 最常见形式
    const arr = ln.match(/^\s*(?:export\s+)?(?:const|let)\s*\[([^\]]*)\]\s*=/);
    if (arr) {
      for (const part of arr[1].split(',')) {
        const name = part.split(':').pop().split('=')[0].trim();
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
          if (!decls.has(name)) decls.set(name, []);
          decls.get(name).push(i + 1);
        }
      }
    }
  });
  return decls;
}

const files = walk(ROOT);
const findings = [];

for (const f of files) {
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const hooks = findHooks(src);
  if (!hooks.length) continue;
  const decls = collectDecls(src);
  for (const h of hooks) {
    for (const d of h.deps) {
      const dLines = decls.get(d);
      if (!dLines) continue; // 非本文件声明 → 外部变量，安全
      // 该变量所有声明都在 hook 之后 → TDZ
      const later = dLines.filter(l => l > h.callLine);
      if (later.length === dLines.length) {
        findings.push({
          file: f, hook: h.hook, callLine: h.callLine,
          deps: h.depsStr, dep: d, declLine: dLines[0],
        });
      }
    }
  }
}

if (!findings.length) {
  console.log(`✅ 扫描 ${files.length} 个文件，未发现 TDZ 依赖数组问题`);
  process.exit(0);
} else {
  console.log(`⚠️  发现 ${findings.length} 处 TDZ 风险（扫描 ${files.length} 个文件）：\n`);
  for (const f of findings) {
    console.log(`${f.file}:${f.callLine}  ${f.hook}(..., ${f.deps})`);
    console.log(`   └─ 依赖 "${f.dep}" 声明于第 ${f.declLine} 行（晚于 hook 调用）`);
  }
  console.log('\n修复方法：把该 hook 移到被依赖变量的声明之后。');
  console.log('（TS 也会报 TS2448，可用 npm run typecheck 交叉确认）');
  process.exit(1);
}
