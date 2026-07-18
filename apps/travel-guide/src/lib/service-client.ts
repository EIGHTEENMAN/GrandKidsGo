// 跨服务 service-to-service 客户端（v2.0）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第九节 D 第五节
//
// 当前用途：travel-guide → auth-service 调 /api/internal/points/*
// 安全：env INTERNAL_SERVICES_TOKEN + auth-service 校验来源 IP（同机器 127.0.0.1）

import { request as httpsRequest } from 'http';
import { request as httpsRequestTLS } from 'https';

const DEFAULT_AUTH_BASE = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3007';
const SERVICE_TOKEN = process.env.INTERNAL_SERVICES_TOKEN || 'dev-internal-token';

function callInternal<T = any>(
  path: string,
  method: 'GET' | 'POST' = 'POST',
  body?: any,
): Promise<{ status: number; data: T }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, DEFAULT_AUTH_BASE);
    const isTLS = url.protocol === 'https:';
    const lib = isTLS ? httpsRequestTLS : httpsRequest;
    const payload = body ? JSON.stringify(body) : undefined;
    const req = lib(
      {
        hostname: url.hostname,
        port: url.port || (isTLS ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-service-token': SERVICE_TOKEN,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload).toString() } : {}),
        },
        timeout: 5000,
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            const data = JSON.parse(chunks);
            resolve({ status: res.statusCode ?? 0, data });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: chunks as any });
          }
        });
      },
    );
    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy(new Error('service call timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

export interface AddPointsArgs {
  userId: string;
  points: number;
  source: 'badge_exchange' | 'weekly_bonus' | 'monthly_bonus' | 'annual_bonus' | 'manual';
  refId?: string;
  description?: string;
}

export async function addPoints(args: AddPointsArgs): Promise<{ ok: boolean; txId?: string; balance?: number; message?: string }> {
  try {
    const res = await callInternal('/api/internal/points/add', 'POST', args);
    if (res.status === 200 && (res.data as any).code === 'OK') {
      return { ok: true, txId: (res.data as any).data.txId, balance: (res.data as any).data.balance };
    }
    return { ok: false, message: (res.data as any).message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function revertPoints(args: { userId: string; points: number; source: string; refId?: string }): Promise<{ ok: boolean; balance?: number; message?: string }> {
  try {
    const res = await callInternal('/api/internal/points/revert', 'POST', args);
    if (res.status === 200 && (res.data as any).code === 'OK') {
      return { ok: true, balance: (res.data as any).data.balance };
    }
    return { ok: false, message: (res.data as any).message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
