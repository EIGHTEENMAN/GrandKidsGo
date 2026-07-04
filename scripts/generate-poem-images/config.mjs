/**
 * 诗配画引擎 — 配置
 *
 * 支持两种 API 后端：
 *   1. OpenAI DALL-E 3 — 质量更好，$0.04/张
 *   2. 通义万相 (阿里云) — 中文友好，需要阿里云 Access Key
 *
 * 设置方式（按优先级）：
 *   - 环境变量（.env 或 export）
 *   - 以下默认值
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __confDirname = dirname(fileURLToPath(import.meta.url))

// 加载 secrets.env（项目外，git 不跟踪）
const userEnvPath = join(homedir(), '.config/haodaer/secrets.env')
if (existsSync(userEnvPath)) {
  try {
    const envText = readFileSync(userEnvPath, 'utf-8')
    for (const line of envText.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
    }
  } catch {}
}

// 加载项目内 .env
const localEnvPath = join(__confDirname, '.env')
if (existsSync(localEnvPath)) {
  try {
    const envText = readFileSync(localEnvPath, 'utf-8')
    for (const line of envText.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
    }
  } catch {}
}

export const CONFIG = {
  // ===== API 选择 =====
  // 可选: 'dall-e' | 'tongyi' | 'mock'
  provider: process.env.AI_PROVIDER || 'mock',

  // ===== OpenAI DALL-E 3 =====
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'dall-e-3',
    // standard: $0.04/张, hd: $0.08/张
    quality: 'standard',
    size: '1024x1024',
  },

  // ===== 通义万相 (阿里云) =====
  tongyi: {
    accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET || '',
    // 通义万相 API 地址
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
    model: 'wanx2.1-t2i',
    size: '1024x1024',
  },

  // ===== MiniMax (海螺AI) =====
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || '',
    endpoint: 'https://api.minimaxi.com/v1/image_generation',
    model: 'image-01',
    size: '1024x1024',
    // MiniMax 支持中文 prompt，价格 ¥49/月（Plus套餐每天50张）
  },

  // ===== Agnes AI (API Hub) =====
  agnes: {
    apiKey: process.env.AGNES_API_KEY || '',
    endpoint: 'https://apihub.agnes-ai.com/v1/images/generations',
    model: 'agnes-image-2.1-flash',
    size: '1024x1024',
  },

  // ===== 生成控制 =====
  generation: {
    // 每首诗生成的图片数量
    imagesPerPoem: 1,
    // 并发请求数
    concurrency: 5,
    // 失败重试次数
    maxRetries: 4,
    // 请求间延迟 (ms) — 避免限流
    delayMs: 1500,
    // 输出目录（相对于脚本路径）
    outputDir: '../../apps/xueshici/public/images/poems',
    // 图片格式: webp | png | jpg
    format: 'webp',
  },

  // ===== 提示词 =====
  prompt: {
    // 默认风格描述 — 统一添加在所有提示词前
    defaultStyle: 'Traditional Chinese ink wash painting style, brush strokes, watercolor on rice paper, elegant composition, minimalist, classical Chinese art, poetic atmosphere, soft colors, artistic --no text, no calligraphy, no words, no watermark',
    // 补充风格（根据朝代/诗人风格添加）
    dynastyStyles: {
      '春秋战国': 'ancient bronze vessel patterns, primitive simplicity, misty landscape',
      '汉': 'Han dynasty simplicity, rugged, earthy tones',
      '唐': 'Tang dynasty golden age, vibrant yet elegant, misty mountains, grand landscapes',
      '宋': 'Song dynasty refined, subtle, monochrome ink wash, poetic restraint, empty space',
      '元': 'Yuan dynasty expressive, dramatic ink wash, wild brushwork',
      '明': 'Ming dynasty decorative, detailed, colorful folk style',
      '清': 'Qing dynasty ornate, intricate detail, literati painting',
    },
    // 图片尺寸模式
    aspectRatio: '1024x1024',
  },
}

// ===== 常量 =====
export const IMAGE_EXT = CONFIG.generation.format === 'webp' ? '.webp' : '.png'

// MiniMax 返回 JPEG，需单独定义扩展名
export const MINIMAX_IMAGE_EXT = '.jpg'
// Agnes AI 返回 PNG
export const AGNES_IMAGE_EXT = '.jpg'

// ===== 根据提供商获取图片扩展名 =====
export function getImageExt(provider) {
  if (provider === 'minimax') return MINIMAX_IMAGE_EXT
  if (provider === 'agnes') return AGNES_IMAGE_EXT
  if (provider === 'mock') return '.webp'
  return IMAGE_EXT
}
export const STATUS_FILE = './generation-status.json'
