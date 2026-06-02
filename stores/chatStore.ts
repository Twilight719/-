import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { streamChat, getFallbackReply, ChatMessage } from '@/services/deepseek';

export interface Message {
  id: string;
  chatId: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: number;
  model?: string;
}

export interface Chat {
  id: string;
  characterId: string;
  characterName: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  online: boolean;
}

export interface Character {
  id: string;
  name: string;
  avatar: string;
  fullImage: string;
  codeName: string;
  race: string;
  origin: string;
  class: string;
  description: string;
  tags: string[];
}

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  characters: Character[];
  isTyping: boolean;
  activeChatId: string | null;
  currentModel: string | null;
  lastRouterReason: string | null;
  isProMode: boolean;
  showProBanner: boolean;
  initChats: () => Promise<void>;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  clearUnread: (chatId: string) => void;
  setActiveChat: (chatId: string | null) => void;
  dismissProBanner: () => void;
  checkProactiveMessage: () => Promise<boolean>;
}

const STORAGE_CHATS = '@rhodes_chats_v2';
const STORAGE_MESSAGES = '@rhodes_messages_v2';
const STORAGE_PROACTIVE = '@rhodes_last_proactive';

// ====== 角色数据 ======
const AMIYA_AVATAR = require('../assets/characters/amiya_avatar.png');
const AMIYA_FULL = require('../assets/characters/amiya_full.png');
const KALTSIT_AVATAR = require('../assets/characters/kaltsit_avatar.webp');
const KALTSIT_FULL = require('../assets/characters/kaltsit_full.webp');
const MON3TR_AVATAR = require('../assets/characters/mon3tr_avatar.webp');
const MON3TR_FULL = require('../assets/characters/mon3tr_full.webp');
const CLOSURE_AVATAR = require('../assets/characters/closure_avatar.webp');
const CLOSURE_FULL = require('../assets/characters/closure_full.webp');

// 角色头像映射表（供加载时修复 asset ID）
const CHARACTER_AVATARS: Record<string, ReturnType<typeof require>> = {
  amiya: AMIYA_AVATAR,
  kaltsit: KALTSIT_AVATAR,
  mon3tr: MON3TR_AVATAR,
  closure: CLOSURE_AVATAR,
};

const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'amiya',
    name: '阿米娅',
    avatar: AMIYA_AVATAR,
    fullImage: AMIYA_FULL,
    codeName: 'Amiya',
    race: '卡特斯',
    origin: '雷姆必拓',
    class: '术师/近卫',
    description: '罗德岛公开领袖，拥有极高的源石技艺适应性。',
    tags: ['公开领袖', '术师', '近卫'],
  },
  {
    id: 'kaltsit',
    name: '凯尔希',
    avatar: KALTSIT_AVATAR,
    fullImage: KALTSIT_FULL,
    codeName: "Kal'tsit",
    race: '菲林',
    origin: '未知',
    class: '医疗',
    description: '罗德岛医疗部负责人，矿石病研究专家。冷静理性，医术精湛。',
    tags: ['医疗', '管理者', '前巴别塔'],
  },
  {
    id: 'mon3tr',
    name: 'Mon3tr',
    avatar: MON3TR_AVATAR,
    fullImage: MON3TR_FULL,
    codeName: 'Mon3tr',
    race: '源石构造体',
    origin: '未知',
    class: '近卫/链愈师',
    description: '凯尔希的共生体，高阶源石生命。已获人形与自由意志，纯粹而直率。',
    tags: ['源石生命', '近卫', '凯尔希的共生体'],
  },
  {
    id: 'closure',
    name: '可露希尔',
    avatar: CLOSURE_AVATAR,
    fullImage: CLOSURE_FULL,
    codeName: 'Closure',
    race: '血魔',
    origin: '卡兹戴尔',
    class: '工程/采购',
    description: '罗德岛总工程师，采购中心负责人。元气满满的技术宅兼奸商。',
    tags: ['工程师', '奸商', '技术宅'],
  },
];

// ====== 阿米娅主动发起聊天的消息池 ======
const PROACTIVE_MESSAGES = [
  '博士，您在吗？我有些担心今天的任务安排...',
  '博士...我刚刚整理完战斗报告。您有空的话，我想和您讨论一下。',
  '博士，凯尔希医生让我提醒您按时吃饭。您今天午餐吃了吗？',
  '博士！刚才医疗部送来了新的源石检测报告，我觉得您需要看一下。',
  '博士...我做了个奇怪的梦。是关于特蕾西娅小姐的...',
  '天已经黑了，博士。您办公室的灯还亮着呢，请记得休息。',
  '博士，今天的训练我表现得很好！...至少可露希尔是这么说的。',
  '博士...您最近好像很累。如果有什么我能分担的，请一定告诉我。',
  '博士，我泡了红茶。要来一杯吗？用的是您上次说喜欢的那种茶叶。',
  '博士！外勤小队刚刚传回了消息。是...是关于整合运动的最新动向。',
  '下雨了，博士。我帮您把窗户关上了。您在办公室吗？',
  '博士，今天有新人干员报到。我陪ta参观了本舰，ta说很期待见到您。',
];

function getRandomProactiveMessage(): string {
  return PROACTIVE_MESSAGES[Math.floor(Math.random() * PROACTIVE_MESSAGES.length)];
}

// ====== 默认 Amiya 聊天（首次使用时创建） ======
const DEFAULT_CHATS: Record<string, { lastMessage: string }> = {
  amiya: { lastMessage: '博士，通讯终端已就绪。随时可以开始对话。' },
  kaltsit: { lastMessage: '医疗部通讯已接通。有事直说。' },
  mon3tr: { lastMessage: 'Mon3tr在这里。博士...凯尔希在吗？' },
  closure: { lastMessage: '博士~要不要看看可露希尔大师的最新发明？今天打折哦！' },
};

function createDefaultChat(charId: string): Chat {
  const char = INITIAL_CHARACTERS.find((c) => c.id === charId);
  const defaults = DEFAULT_CHATS[charId] || DEFAULT_CHATS['amiya'];
  const avatars: Record<string, ReturnType<typeof require>> = {
    amiya: AMIYA_AVATAR, kaltsit: KALTSIT_AVATAR,
    mon3tr: MON3TR_AVATAR, closure: CLOSURE_AVATAR,
  };
  return {
    id: `chat-${charId}`,
    characterId: charId,
    characterName: char?.name || charId,
    avatar: avatars[charId] || AMIYA_AVATAR,
    lastMessage: defaults.lastMessage,
    lastMessageTime: Date.now(),
    unreadCount: 0,
    online: true,
  };
}

function createWelcomeMessage(): Message {
  return {
    id: 'm-welcome',
    chatId: 'chat-amiya',
    sender: 'ai',
    content: '博士，通讯终端已就绪。我是阿米娅，有什么我能帮您的吗？',
    timestamp: Date.now(),
  };
}

// ====== 持久化辅助函数 ======
async function saveChats(chats: Chat[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_CHATS, JSON.stringify(chats));
  } catch (e) {
    console.error('[ChatStore] 保存聊天列表失败:', e);
  }
}

async function saveMessages(messages: Record<string, Message[]>): Promise<void> {
  try {
    // 限制每个聊天最多存储 200 条消息防止过大
    const trimmed: Record<string, Message[]> = {};
    for (const [key, msgs] of Object.entries(messages)) {
      trimmed[key] = msgs.slice(-200);
    }
    await AsyncStorage.setItem(STORAGE_MESSAGES, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[ChatStore] 保存消息失败:', e);
  }
}

async function loadChats(): Promise<Chat[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_CHATS);
    if (raw) {
      const chats: Chat[] = JSON.parse(raw);
      // 强制刷新 avatar 为当前 asset ID（require() 在每次打包/热更后 ID 会变）
      return chats.map((chat) => ({
        ...chat,
        avatar: CHARACTER_AVATARS[chat.characterId] || AMIYA_AVATAR,
      }));
    }
  } catch (e) {
    console.error('[ChatStore] 加载聊天列表失败:', e);
  }
  return [];
}

async function loadMessages(): Promise<Record<string, Message[]>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_MESSAGES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[ChatStore] 加载消息失败:', e);
  }
  return {};
}

// ====== Store ======
export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  characters: INITIAL_CHARACTERS,
  isTyping: false,
  activeChatId: null,
  currentModel: null,
  lastRouterReason: null,
  isProMode: false,
  showProBanner: false,

  initChats: async () => {
    // 从本地加载持久化的聊天数据
    let persistedChats = await loadChats();
    let persistedMessages = await loadMessages();

    // 首次使用：创建默认聊天
    if (persistedChats.length === 0) {
      persistedChats = [
        createDefaultChat('amiya'),
        createDefaultChat('kaltsit'),
      ];
      persistedMessages = {
        'chat-amiya': [createWelcomeMessage()],
        'chat-kaltsit': [
          {
            id: 'm-welcome-k',
            chatId: 'chat-kaltsit',
            sender: 'ai' as const,
            content: '医疗部通讯频道已加密。我是凯尔希。你的体检报告显示交感神经系统活性偏高——最好不是又熬夜了。',
            timestamp: Date.now(),
          },
        ],
      };
    }

    // 迁移：确保所有默认干员聊天都存在（旧版本升级）
    const requiredChats = ['chat-amiya', 'chat-kaltsit', 'chat-mon3tr', 'chat-closure'];
    for (const requiredChatId of requiredChats) {
      if (!persistedChats.find((c) => c.id === requiredChatId)) {
        const charId = requiredChatId.replace('chat-', '');
        persistedChats.push(createDefaultChat(charId));
        if (!persistedMessages[requiredChatId]) {
          persistedMessages[requiredChatId] = [];
        }
      }
    }

    set({
      chats: persistedChats,
      messages: persistedMessages,
    });
  },

  sendMessage: async (chatId: string, content: string) => {
    // 确保 chat 存在
    const existingChat = get().chats.find((c) => c.id === chatId);
    if (!existingChat) {
      const charId = chatId === 'chat-kaltsit' ? 'kaltsit' : 'amiya';
      set((state) => ({
        chats: [createDefaultChat(charId), ...state.chats],
      }));
    }

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      chatId,
      sender: 'user',
      content,
      timestamp: Date.now(),
    };

    set((state) => {
      const updated = {
        messages: {
          ...state.messages,
          [chatId]: [...(state.messages[chatId] || []), newMessage],
        },
        chats: state.chats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                lastMessage: content,
                lastMessageTime: Date.now(),
              }
            : chat
        ),
        currentModel: null,
        lastRouterReason: null,
        isProMode: false,
        showProBanner: false,
      };
      // 异步保存
      saveMessages(updated.messages);
      saveChats(updated.chats);
      return updated;
    });

    set({ isTyping: true });

    const chatMessages = get().messages[chatId] || [];
    const history: ChatMessage[] = chatMessages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    const aiMessageId = `m-${Date.now()}-ai`;
    let aiContent = '';
    let usedModel: string | null = null;
    let isFallback = false;

    try {
      const charId = chatId.replace('chat-', '');
      const generator = streamChat(history, content, charId);

      for await (const chunk of generator) {
        if (chunk.type === 'model') {
          usedModel = chunk.model || null;
          const isPro = chunk.model === 'pro';
          set({
            currentModel: chunk.model || null,
            lastRouterReason: chunk.reason || null,
            isProMode: isPro,
            showProBanner: isPro,
          });
          if (isPro) {
            setTimeout(() => {
              set({ showProBanner: false });
            }, 2500);
          }
        } else if (chunk.type === 'content') {
          aiContent += chunk.data || '';
          set((state) => {
            const existing = state.messages[chatId] || [];
            const lastMsg = existing[existing.length - 1];
            if (lastMsg && lastMsg.id === aiMessageId) {
              const updated = [...existing];
              updated[updated.length - 1] = {
                ...lastMsg,
                content: aiContent,
              };
              return {
                messages: { ...state.messages, [chatId]: updated },
              };
            } else {
              const newAiMessage: Message = {
                id: aiMessageId,
                chatId,
                sender: 'ai',
                content: aiContent,
                timestamp: Date.now(),
                model: usedModel || undefined,
              };
              return {
                messages: {
                  ...state.messages,
                  [chatId]: [...existing, newAiMessage],
                },
              };
            }
          });
        } else if (chunk.type === 'error') {
          isFallback = true;
          break;
        } else if (chunk.type === 'fallback') {
          isFallback = true;
        }
      }
    } catch {
      isFallback = true;
    }

    // 无 API Key 或失败 → 本地降级回复
    if (isFallback && aiContent.trim().length === 0) {
      const fallbackReply = getFallbackReply();
      aiContent = fallbackReply;
      set((state) => {
        const existing = state.messages[chatId] || [];
        const updated = {
          messages: {
            ...state.messages,
            [chatId]: [
              ...existing,
              {
                id: aiMessageId,
                chatId,
                sender: 'ai' as const,
                content: fallbackReply,
                timestamp: Date.now(),
                model: 'local',
              },
            ],
          },
          isTyping: false,
          currentModel: 'local',
        };
        saveMessages(updated.messages);
        return updated;
      });
    } else {
      set({ isTyping: false });
      // 保存最终消息
      const finalMessages = get().messages;
      saveMessages(finalMessages);
    }

    // 更新聊天列表
    set((state) => {
      const updated = {
        chats: state.chats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                lastMessage: aiContent || '...',
                lastMessageTime: Date.now(),
                unreadCount:
                  state.activeChatId === chatId ? 0 : chat.unreadCount + 1,
              }
            : chat
        ),
      };
      saveChats(updated.chats);
      return updated;
    });
  },

  clearUnread: (chatId: string) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ),
    }));
  },

  setActiveChat: (chatId: string | null) => {
    set({ activeChatId: chatId });
  },

  dismissProBanner: () => {
    set({ showProBanner: false });
  },

  // 检查是否应该发送阿米娅的主动消息（每天 2-3 次）
  checkProactiveMessage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PROACTIVE);
      const lastTime = raw ? parseInt(raw, 10) : 0;
      const now = Date.now();
      const eightHours = 8 * 60 * 60 * 1000;

      // 距离上次主动消息超过 8 小时
      if (now - lastTime > eightHours) {
        const proactiveMsg = getRandomProactiveMessage();

        // 确保阿米娅的聊天存在
        const chats = get().chats;
        let amiyaChat = chats.find((c) => c.id === 'chat-amiya');
        if (!amiyaChat) {
          amiyaChat = createDefaultChat('amiya');
        }

        const newAiMessage: Message = {
          id: `m-proactive-${Date.now()}`,
          chatId: 'chat-amiya',
          sender: 'ai',
          content: proactiveMsg,
          timestamp: Date.now(),
        };

        set((state) => {
          const updated = {
            messages: {
              ...state.messages,
              'chat-amiya': [
                ...(state.messages['chat-amiya'] || []),
                newAiMessage,
              ],
            },
            chats: state.chats.map((chat) =>
              chat.id === 'chat-amiya'
                ? {
                    ...chat,
                    lastMessage: proactiveMsg,
                    lastMessageTime: Date.now(),
                    unreadCount: chat.unreadCount + 1,
                  }
                : chat
            ),
          };
          // 如果阿米娅聊天不在列表中，创建它
          if (!state.chats.find((c) => c.id === 'chat-amiya')) {
            updated.chats = [
              {
                ...createDefaultChat('amiya'),
                lastMessage: proactiveMsg,
                lastMessageTime: Date.now(),
                unreadCount: 1,
              },
              ...updated.chats,
            ];
          }
          saveMessages(updated.messages);
          saveChats(updated.chats);
          return updated;
        });

        // 记录本次主动消息时间
        await AsyncStorage.setItem(STORAGE_PROACTIVE, String(now));
        return true;
      }
    } catch (e) {
      console.error('[ChatStore] 主动消息检查失败:', e);
    }
    return false;
  },
}));
