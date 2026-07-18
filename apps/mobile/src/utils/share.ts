// 分享到外部平台工具
// v1 阶段仅做微信（小程序/朋友圈/H5），小红书 API 申请中（v2 评估）

export interface SharePayload {
  title: string;
  desc: string;
  link: string;
  imageUrl?: string;
}

/**
 * 移动端 uni-app 内分享入口（封装 uni.share 调用）
 */
export function shareToWeixinFriend(payload: SharePayload): Promise<boolean> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN || APP-PLUS
    try {
      uni.share({
        provider: 'weixin',
        scene: 'WXSceneSession',
        title: payload.title,
        summary: payload.desc,
        href: payload.link,
        imageUrl: payload.imageUrl,
        success: () => resolve(true),
        fail: () => resolve(false),
      });
      return;
    } catch {
      // 落到下面
    }
    // #endif
    // 兜底：复制链接到剪贴板
    uni.setClipboardData({
      data: `${payload.title}\n${payload.desc}\n${payload.link}`,
      success: () => {
        uni.showToast({ title: '链接已复制，去微信粘贴', icon: 'none' });
        resolve(true);
      },
      fail: () => resolve(false),
    });
  });
}

export function shareToWeixinTimeline(payload: SharePayload): Promise<boolean> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN || APP-PLUS
    try {
      uni.share({
        provider: 'weixin',
        scene: 'WXSenceTimeline',
        title: payload.title,
        summary: payload.desc,
        href: payload.link,
        imageUrl: payload.imageUrl,
        success: () => resolve(true),
        fail: () => resolve(false),
      });
      return;
    } catch { /* 落到下面 */ }
    // #endif
    uni.setClipboardData({
      data: payload.link,
      success: () => {
        uni.showToast({ title: '链接已复制', icon: 'none' });
        resolve(true);
      },
      fail: () => resolve(false),
    });
  });
}

/**
 * 小红书分享占位——v1 不接（运营侧需提前 2 周申请）
 */
export function shareToXiaohongshu(_payload: SharePayload): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '小红书分享准备中',
      content: '小红书平台账号申请中，暂以复制链接方式替代',
      confirmText: '复制链接',
      success: (r) => {
        if (r.confirm) {
          uni.setClipboardData({
            data: _payload.link,
            success: () => resolve(true),
            fail: () => resolve(false),
          });
        } else {
          resolve(false);
        }
      },
      fail: () => resolve(false),
    });
  });
}
