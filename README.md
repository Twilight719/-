# 干员终端 — 罗德岛通讯终端

> Arknights-themed AI chat app. Chat with Rhodes Island operators powered by DeepSeek AI.

## 功能

- **20名干员独立聊天** — 阿米娅、凯尔希、Mon3tr、可露希尔及7对异格干员，每位有独立性格和提示词
- **群聊系统** — 自由创建群组，干员间自主互动交流
- **AI 角色扮演** — DeepSeek 驱动，实时流式回复，打字机效果
- **实时时间感知** — 干员根据真实时间调整对话情境
- **聊天置顶** — 长按置顶，新消息自动排序
- **EAS 热更新** — OTA 秒级推送，无需重新下载 APK

## 技术栈

| 技术 | 用途 |
|------|------|
| Expo SDK 52 | 跨平台框架 |
| Expo Router v4 | 文件路由 + Tab 导航 |
| React Native | UI 渲染 |
| Zustand | 状态管理 |
| DeepSeek API | AI 对话 |
| EAS Build + Update | 打包 + 热更新 |

## 开始使用

```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 构建 Android APK
eas build --platform android --profile preview

# 发布热更新
eas update --branch preview --message "更新内容"
```

## 配置 AI

1. 前往 [platform.deepseek.com](https://platform.deepseek.com) 注册获取 API Key
2. App 内 **设置** → 填入 API Key
3. 新用户赠送 500 万 tokens 免费额度

## 项目结构

```
app/
├── (tabs)/           # 消息 / 群聊 / 设置 三个 Tab
├── chat/[id].tsx     # 干员单聊页
├── character/[id].tsx # 干员详情页
├── group-chat/[id].tsx # 群聊页
├── changelog.tsx     # 更新日志页
└── index.tsx         # 启动页
services/
├── deepseek.ts       # DeepSeek API + 提示词
├── modelRouter.ts    # Flash/Pro 路由
└── proactiveService.ts # 主动消息
stores/
├── chatStore.ts      # 聊天状态管理
├── groupStore.ts     # 群聊状态管理
└── settingsStore.ts  # 设置管理
components/
├── ArkUI.tsx         # UI 组件库
├── UpdateModal.tsx   # 热更新弹窗
└── GroupAvatar.tsx   # 组合头像
```

## 版本

当前版本：**v1.6.3**

[查看完整更新日志](./constants/updates.ts)
