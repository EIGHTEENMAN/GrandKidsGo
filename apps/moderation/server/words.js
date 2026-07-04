// Sensitive words for children's platform content moderation
// Categories: profanity, violence, adult, bullying, spam, advertising

export const SENSITIVE_WORDS = [
  // Profanity (粗口)
  '我操', '我靠', '妈的', '傻逼', '草泥马', '特么', '尼玛', '日你', '滚蛋',
  '操你妈', '去死', '混蛋', '王八蛋', '废物', '垃圾', '有病', '吃屎',
  '脑残', '弱智', '智障', '白痴', '蠢货',

  // Violence (暴力)
  '打人', '杀人', '自杀', '跳楼', '砍人', '放火', '爆炸', '枪杀',
  '打架', '斗殴', '绑架', '抢劫', '杀人犯', '恐怖', '炸弹',

  // Adult (成人内容)
  '色情', '裸体', '裸露', '性爱', '成人', '18禁', '黄片', '三级',
  '裸照', '裸聊', '约炮', '一夜情', '援交', '卖淫', '嫖娼',

  // Bullying (霸凌)
  '去死吧', '你完了', '等着瞧', '找人打你', '叫人来', '揍你', '打死你',
  '孤立', '排挤', '丑八怪', '死胖子', '矮冬瓜', '笨死了', '猪头',

  // Spam (垃圾广告)
  '加微信', '加QQ', '私聊', '私信', '兼职', '日赚', '月入过万',
  '点击链接', '免费领取', '中奖', '恭喜你', '转账', '汇款',
  '刷单', '刷赞', '刷粉', '代购', '代理',

  // Sensitive topics (敏感话题 - children should not discuss)
  '毒品', '吸毒', '摇头丸', '大麻', '海洛因', '冰毒',
  '赌博', '赌场', '赌球', '赌马', '彩票',
  '烟', '香烟', '烟酒', '酒', '喝酒', '抽烟',
];

// Whitelist: common words that contain substrings of sensitive words but are harmless
export const WHITELIST = [
  '垃圾分类', '成人礼', '成年人', '消灭',
  '成人教育', '成人',
];
