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
