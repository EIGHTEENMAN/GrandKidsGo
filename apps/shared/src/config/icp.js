/**
 * ICP 备案号与公安联网备案号配置
 *
 * 修改本文件即可全站生效，无需在每个组件中修改。
 *
 * 三个备案号全部下来后，把以下占位替换为真实号码：
 *
 *   icpMain:   '闽ICP备 2026xxxxxx 号-1'   → '闽ICP备 20260918 号-1'
 *   icpTravel: '闽ICP备 2026xxxxxx 号-2'   → '闽ICP备 20260918 号-2'
 *   gongan:    '闽公网安备 35000000xxxxxx 号' → '闽公网安备 35000000001234 号'
 *
 * 当前状态：审核中（ICP 备案申请已提交，等待福建省通信管理局审核）
 */

export default {
  // 主备案号 - grandand.com 及挂靠 -1 的子站
  // （xueshici / xueguoxue / xuetongshi / english / tiaozhan / m.grandand.com）
  icpMain: '闽ICP备 2026xxxxxx 号-1',

  // 走天下备案号 - travel.grandand.com 单独备 -2
  icpTravel: '闽ICP备 2026xxxxxx 号-2',

  // 公安联网备案号 - 拿到 ICP 备案号 30 天内办理
  // 入口：https://beian.mps.gov.cn
  gongan: '闽公网安备 35000000xxxxxx 号',

  // 公网安备号查询 URL
  gonganUrl: 'https://beian.mps.gov.cn/',
}
