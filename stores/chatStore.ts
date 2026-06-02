import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { streamChat, getFallbackReply, ChatMessage } from '@/services/deepseek';
import { useSettingsStore } from '@/stores/settingsStore';

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
  // 异格：如果有 alterId，表示这是异格版本；如果有 alterOf，表示原版ID
  alterId?: string;   // 异格版本ID（原版→异格）
  alterOf?: string;   // 原版ID（异格→原版）
  alterName?: string; // 异格版本名称
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

// ====== 干员主动消息（回退用） ======
const PROACTIVE_FALLBACK: Record<string, string[]> = {
  amiya: [
    '博士，您在吗？我有些担心今天的任务安排...',
    '博士...我泡了红茶，要来一杯吗？',
    '博士！外勤小队刚刚传回了消息。',
  ],
  kaltsit: [
    '你的体检报告过期了。来医疗部一趟。',
    '博士，医疗部的季度报告需要你签字。',
    '哼...你又熬夜了。我在监控里看到了。',
  ],
  mon3tr: [
    '博士！Mon3tr发现了一个奇怪的东西...可以吃吗？',
    '博士博士，凯尔希今天夸我了！...应该是夸吧。',
    '博士...Mon3tr有点无聊。可以去找你玩吗？',
  ],
  closure: [
    '博士~新品上市！今天只要998龙门币！',
    '博士！我发明了一个会自动泡咖啡的无人机！...就是偶尔会爆炸。',
    '博士~工程部预算能不能再批一点嘛~',
  ],
};

function getFallbackProactive(charId: string): string {
  const pool = PROACTIVE_FALLBACK[charId] || PROACTIVE_FALLBACK['amiya'];
  return pool[Math.floor(Math.random() * pool.length)];
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
      const now = new Date();
      const hour = now.getHours();

      // 夜间静默：23:00 ~ 09:00 不打扰博士
      if (hour >= 23 || hour < 9) return false;

      // 距离上次主动消息超过 8 小时
      const raw = await AsyncStorage.getItem(STORAGE_PROACTIVE);
      const lastTime = raw ? parseInt(raw, 10) : 0;
      const eightHours = 8 * 60 * 60 * 1000;
      if (now.getTime() - lastTime <= eightHours) return false;

      // 随机选一位干员
      const charIds = ['amiya', 'kaltsit', 'mon3tr', 'closure'];
      const charId = charIds[Math.floor(Math.random() * charIds.length)];
      const charName = INITIAL_CHARACTERS.find((c) => c.id === charId)?.name || '阿米娅';
      const chatId = `chat-${charId}`;

      let content = '';

      // 尝试 AI 生成
      const settings = useSettingsStore.getState();
      const config = settings.flash;
      if (config.apiKey.trim()) {
        try {
          const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const charPrompts: Record<string, string> = {
            amiya: '你正在以阿米娅的身份给博士发一条主动消息。温柔、关心，1-2句话。不要超过50字。',
            kaltsit: '你正在以凯尔希的身份给博士发一条主动消息。冷淡、专业、嘴硬心软。1-2句。不要超过50字。',
            mon3tr: '你正在以Mon3tr的身份给博士发一条主动消息。孩子般直率、好奇。1-2句。不要超过50字。',
            closure: '你正在以可露希尔的身份给博士发一条主动消息。元气、带推销或发明话题。1-2句。不要超过50字。',
          };

          const url = `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
            body: JSON.stringify({
              model: config.model,
              messages: [
                { role: 'system', content: `${charPrompts[charId] || charPrompts['amiya']}\n当前时间：${timeStr}\n根据时间和干员性格生成一条自然的主动消息，不要重复之前的消息。` },
                { role: 'user', content: '请给博士发一条消息。' },
              ],
              stream: false, temperature: 1.0, max_tokens: 80,
            }),
          });
          if (resp.ok) {
            const json = await resp.json();
            content = json.choices?.[0]?.message?.content?.trim() || '';
          }
        } catch {}
      }

      // AI 失败 → 回退
      if (!content || content.length < 2) {
        content = getFallbackProactive(charId);
      }

      const newMsg: Message = {
        id: `m-proactive-${Date.now()}`,
        chatId, sender: 'ai', content, timestamp: Date.now(),
      };

      set((state) => {
        const chatExists = state.chats.find((c) => c.id === chatId);
        const updated = {
          messages: {
            ...state.messages,
            [chatId]: [...(state.messages[chatId] || []), newMsg],
          },
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, lastMessage: content, lastMessageTime: Date.now(), unreadCount: chat.unreadCount + 1 }
              : chat
          ),
        };
        if (!chatExists) {
          const newChat = createDefaultChat(charId);
          updated.chats = [{ ...newChat, lastMessage: content, lastMessageTime: Date.now(), unreadCount: 1 }, ...updated.chats];
        }
        saveMessages(updated.messages);
        saveChats(updated.chats);
        return updated;
      });

      await AsyncStorage.setItem(STORAGE_PROACTIVE, String(now.getTime()));
      return true;
    } catch (e) {
      console.error('[ChatStore] 主动消息:', e);
    }
    return false;
  },
}));
