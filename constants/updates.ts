// 📋 每次热更新前在此文件顶部添加新条目
// 格式: { id, version, date, message }
// id 可以是递增数字或日期标识

export interface UpdateEntry {
  id: string;
  version: string;
  date: string;
  message: string;
}

export const UPDATE_LOG: UpdateEntry[] = [
  {
    id: '14',
    version: '1.2.1',
    date: '2026-06-02',
    message:
      '🔧 修复部分用户凯尔希聊天不显示\n• 添加旧版本数据迁移逻辑\n• 确保升级后凯尔希自动出现',
  },
  {
    id: '13',
    version: '1.2.0',
    date: '2026-06-02',
    message:
      '🩺 凯尔希医生加入罗德岛通讯\n• 全新干员：凯尔希（医疗部负责人）\n• 独立性格：理性冷淡、医学权威、嘴硬心软\n• Mon3tr 战斗召唤物\n• 群聊中可与阿米娅互动讨论',
  },
  {
    id: '12',
    version: '1.1.2',
    date: '2026-06-02',
    message:
      '🕐 简化时间上下文\n• 移除冗余情境描写（环境/状态/情绪）\n• 仅注入当前日期时间\n• 阿米娅自然感知时间并自由回应',
  },
  {
    id: '11',
    version: '1.1.1',
    date: '2026-06-02',
    message:
      '🔧 修复消息页头像显示\n• 修复热更新后 asset ID 变动导致头像空白\n• 头像现在始终使用当前 bundle 资源\n• 添加头像加载失败时的占位图标',
  },
  {
    id: '10',
    version: '1.1.0',
    date: '2026-06-02',
    message:
      '📱 导航重构 + 群聊上线\n• 底部三 Tab：消息 / 群聊 / 设置\n• 修复设置页面无法返回消息页的 bug\n• 罗德岛群聊（阿米娅×凯尔希×可露希尔）\n• 群聊中干员之间可互动讨论',
  },
  {
    id: '9',
    version: '1.0.9',
    date: '2026-06-02',
    message:
      '🕐 阿米娅实时时间感知\n• 动态注入当前日期和时间\n• 7 个时段不同情境（早晨→深夜）\n• 根据时间调整对话语气和话题\n• 深夜催睡觉 / 中午催吃饭 / 晚上聊心事',
  },
  {
    id: '8',
    version: '1.0.8',
    date: '2026-06-02',
    message:
      '💾 聊天持久化 + 主动消息\n• 聊天记录自动保存，重启不丢失\n• 删除模拟聊天数据，清爽初始体验\n• 阿米娅每 8 小时发起一次主动聊天\n• 12 条随机主动消息池',
  },
  {
    id: '7',
    version: '1.0.7',
    date: '2026-06-02',
    message:
      '🔧 三项聊天体验优化\n• 输入框始终跟随键盘（不再跑到顶部）\n• AI 回复打字机逐字动画\n• 新消息自动滚动到底部\n• 流式/非流式双模式智能切换',
  },
  {
    id: '6',
    version: '1.0.6',
    date: '2026-06-02',
    message:
      '🔧 修复输入法键盘问题\n• 移除 KeyboardAvoidingView\n• 手动管理键盘高度\n• 中文输入法收起后不再残留空白\n• 发送按钮始终紧贴键盘上方',
  },
  {
    id: '5',
    version: '1.0.5',
    date: '2026-06-02',
    message:
      '🎨 全新更新弹窗设计\n• 罗德岛终端美学风格\n• 脉冲光晕动画效果\n• 终端命令行状态栏\n• 六边形图标 + 扫描线纹理',
  },
  {
    id: '4',
    version: '1.0.4',
    date: '2026-06-02',
    message:
      '🔧 修复 AI 对话连接问题\n• 添加非流式 API 请求回退\n• 适配 React Native Android 环境\n• 修复设置保存错误静默问题',
  },
  {
    id: '3',
    version: '1.0.3',
    date: '2026-06-02',
    message:
      '🐛 修复启动崩溃\n• 字体改为本地加载，解决 Google CDN 不可用问题\n• 替换真实 App 图标\n• 添加 expo-updates 配置',
  },
  {
    id: '2',
    version: '1.0.2',
    date: '2026-06-02',
    message: '🔧 修复依赖版本兼容性\n• react-native → 0.76.9\n• 修复 Gradle 编译失败',
  },
  {
    id: '1',
    version: '1.0.1',
    date: '2026-06-01',
    message:
      '🎉 干员终端首次发布\n• 阿米娅 AI 角色扮演对话\n• PRTS 智能路由（Flash/Pro 双模式）\n• 干员详情页\n• 通讯终端主界面',
  },
];

export const LATEST_UPDATE = UPDATE_LOG[0];
