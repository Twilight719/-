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
  switchAlter: (chatId: string) => void;
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
const TEXAS_AVATAR = require('../assets/characters/texas_avatar.webp');
const TEXAS_FULL = require('../assets/characters/texas_full.webp');
const TEXAS_ALTER_AVATAR = require('../assets/characters/texas_alter_avatar.webp');
const TEXAS_ALTER_FULL = require('../assets/characters/texas_alter_full.webp');
const LAPPLAND_AVATAR = require('../assets/characters/lappland_avatar.webp');
const LAPPLAND_ALTER_AVATAR = require('../assets/characters/lappland_alter_avatar.webp');
const SILENCE_AVATAR = require('../assets/characters/silence_avatar.webp');
const SILENCE_ALTER_AVATAR = require('../assets/characters/silence_alter_avatar.webp');
const EYJA_AVATAR = require('../assets/characters/eyja_avatar.webp');
const EYJA_ALTER_AVATAR = require('../assets/characters/eyja_alter_avatar.webp');
const CHEN_AVATAR = require('../assets/characters/chen_avatar.webp');
const CHEN_ALTER_AVATAR = require('../assets/characters/chen_alter_avatar.webp');
const NEARL_AVATAR = require('../assets/characters/nearl_avatar.webp');
const NEARL_ALTER_AVATAR = require('../assets/characters/nearl_alter_avatar.webp');
const SIEGE_AVATAR = require('../assets/characters/siege_avatar.webp');
const SIEGE_ALTER_AVATAR = require('../assets/characters/siege_alter_avatar.webp');

// 角色头像映射表（供加载时修复 asset ID + 异格切换）
const CHARACTER_AVATARS: Record<string, ReturnType<typeof require>> = {
  amiya: AMIYA_AVATAR, kaltsit: KALTSIT_AVATAR,
  mon3tr: MON3TR_AVATAR, closure: CLOSURE_AVATAR,
  texas: TEXAS_AVATAR, texas_alter: TEXAS_ALTER_AVATAR,
  lappland: LAPPLAND_AVATAR, lappland_alter: LAPPLAND_ALTER_AVATAR,
  silence: SILENCE_AVATAR, silence_alter: SILENCE_ALTER_AVATAR,
  eyja: EYJA_AVATAR, eyja_alter: EYJA_ALTER_AVATAR,
  chen: CHEN_AVATAR, chen_alter: CHEN_ALTER_AVATAR,
  nearl: NEARL_AVATAR, nearl_alter: NEARL_ALTER_AVATAR,
  siege: SIEGE_AVATAR, siege_alter: SIEGE_ALTER_AVATAR,
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
  // ====== 异格干员（7对14名） ======
  // 德克萨斯 ↔ 缄默德克萨斯
  {
    id: 'texas', name: '德克萨斯', avatar: TEXAS_AVATAR, fullImage: TEXAS_FULL,
    codeName: 'Texas', race: '鲁珀', origin: '叙拉古', class: '先锋',
    description: '企鹅物流押运员，沉默寡言的酷girl。爱吃pocky。',
    tags: ['先锋', '企鹅物流', '沉默'], alterId: 'texas_alter', alterName: '缄默德克萨斯',
  },
  {
    id: 'texas_alter', name: '缄默德克萨斯', avatar: TEXAS_ALTER_AVATAR, fullImage: TEXAS_ALTER_FULL,
    codeName: 'Texas the Omertosa', race: '鲁珀', origin: '叙拉古', class: '特种',
    description: '与过去和解的德克萨斯，沉默但不再逃避。',
    tags: ['特种', '企鹅物流', '异格'], alterOf: 'texas',
  },
  // 拉普兰德 ↔ 荒芜拉普兰德
  {
    id: 'lappland', name: '拉普兰德', avatar: LAPPLAND_AVATAR, fullImage: require('../assets/characters/lappland_full.webp'),
    codeName: 'Lappland', race: '鲁珀', origin: '叙拉古', class: '近卫',
    description: '狂战士，好战但忠诚。对德克萨斯有执念。',
    tags: ['近卫', '叙拉古', '狂战士'], alterId: 'lappland_alter', alterName: '荒芜拉普兰德',
  },
  {
    id: 'lappland_alter', name: '荒芜拉普兰德', avatar: LAPPLAND_ALTER_AVATAR, fullImage: require('../assets/characters/lappland_alter_full.webp'),
    codeName: 'Lappland the Decadenza', race: '鲁珀', origin: '叙拉古', class: '近卫',
    description: '经历叙拉古事件后更成熟的拉普兰德。',
    tags: ['近卫', '叙拉古', '异格'], alterOf: 'lappland',
  },
  // 赫默 ↔ 淬羽赫默
  {
    id: 'silence', name: '赫默', avatar: SILENCE_AVATAR, fullImage: require('../assets/characters/silence_full.webp'),
    codeName: 'Silence', race: '黎博利', origin: '哥伦比亚', class: '医疗',
    description: '罗德岛研究员，认真内向，对科研执着。',
    tags: ['医疗', '莱茵生命', '研究员'], alterId: 'silence_alter', alterName: '淬羽赫默',
  },
  {
    id: 'silence_alter', name: '淬羽赫默', avatar: SILENCE_ALTER_AVATAR, fullImage: require('../assets/characters/silence_alter_full.webp'),
    codeName: 'Silence the Paradigmatic', race: '黎博利', origin: '哥伦比亚', class: '辅助',
    description: '不再畏缩，敢于对抗权威的赫默。',
    tags: ['辅助', '莱茵生命', '异格'], alterOf: 'silence',
  },
  // 艾雅法拉 ↔ 纯烬艾雅法拉
  {
    id: 'eyja', name: '艾雅法拉', avatar: EYJA_AVATAR, fullImage: require('../assets/characters/eyja_full.webp'),
    codeName: 'Eyjafjalla', race: '卡普里尼', origin: '莱塔尼亚', class: '术师',
    description: '天灾研究学者，听觉障碍，温柔认真。',
    tags: ['术师', '天灾研究', '听觉障碍'], alterId: 'eyja_alter', alterName: '纯烬艾雅法拉',
  },
  {
    id: 'eyja_alter', name: '纯烬艾雅法拉', avatar: EYJA_ALTER_AVATAR, fullImage: require('../assets/characters/eyja_alter_full.webp'),
    codeName: 'Eyjafjalla the Hvít Aska', race: '卡普里尼', origin: '莱塔尼亚', class: '医疗',
    description: '经历灰烬事件后更坚强的艾雅法拉。',
    tags: ['医疗', '异格'], alterOf: 'eyja',
  },
  // 陈 ↔ 假日威龙陈
  {
    id: 'chen', name: '陈', avatar: CHEN_AVATAR, fullImage: require('../assets/characters/chen_full.webp'),
    codeName: 'Ch\'en', race: '龙', origin: '龙门', class: '近卫',
    description: '龙门近卫局督察，正直严肃火爆脾气。',
    tags: ['近卫', '龙门', '督察'], alterId: 'chen_alter', alterName: '假日威龙陈',
  },
  {
    id: 'chen_alter', name: '假日威龙陈', avatar: CHEN_ALTER_AVATAR, fullImage: require('../assets/characters/chen_alter_full.webp'),
    codeName: 'Ch\'en the Holungday', race: '龙', origin: '龙门', class: '狙击',
    description: '度假中放松的陈sir，偶尔露出笑容。',
    tags: ['狙击', '龙门', '异格'], alterOf: 'chen',
  },
  // 临光 ↔ 耀骑士临光
  {
    id: 'nearl', name: '临光', avatar: NEARL_AVATAR, fullImage: require('../assets/characters/nearl_full.webp'),
    codeName: 'Nearl', race: '库兰塔', origin: '卡西米尔', class: '重装',
    description: '卡西米尔骑士，正直温柔守护型。',
    tags: ['重装', '卡西米尔', '骑士'], alterId: 'nearl_alter', alterName: '耀骑士临光',
  },
  {
    id: 'nearl_alter', name: '耀骑士临光', avatar: NEARL_ALTER_AVATAR, fullImage: require('../assets/characters/nearl_alter_full.webp'),
    codeName: 'Nearl the Radiant Knight', race: '库兰塔', origin: '卡西米尔', class: '近卫',
    description: '经历黑暗后依然选择光明的临光。',
    tags: ['近卫', '卡西米尔', '异格'], alterOf: 'nearl',
  },
  // 推进之王 ↔ 维娜·维多利亚
  {
    id: 'siege', name: '推进之王', avatar: SIEGE_AVATAR, fullImage: require('../assets/characters/siege_full.webp'),
    codeName: 'Siege', race: '阿斯兰', origin: '维多利亚', class: '先锋',
    description: '格拉斯哥帮领袖，自信领导力强。',
    tags: ['先锋', '维多利亚', '领袖'], alterId: 'siege_alter', alterName: '维娜·维多利亚',
  },
  {
    id: 'siege_alter', name: '维娜·维多利亚', avatar: SIEGE_ALTER_AVATAR, fullImage: require('../assets/characters/siege_alter_full.webp'),
    codeName: 'Vina Victoria', race: '阿斯兰', origin: '维多利亚', class: '近卫',
    description: '觉醒维多利亚王室血脉的推进之王。',
    tags: ['近卫', '维多利亚', '异格'], alterOf: 'siege',
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
  texas: { lastMessage: '...企鹅物流。有事？' },
  lappland: { lastMessage: '哈哈哈！博士！来打架吗？' },
  silence: { lastMessage: '博士...莱茵生命的研究数据需要你过目。' },
  eyja: { lastMessage: '博士？啊...天灾预警报告在这里...您说什么？' },
  chen: { lastMessage: '龙门近卫局，陈。有什么需要汇报的？' },
  nearl: { lastMessage: '博士，今天的训练计划已安排。需要调整吗？' },
  siege: { lastMessage: '博士！格拉斯哥帮的兄弟们都在等你。' },
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
    const requiredChats = [
  'chat-amiya', 'chat-kaltsit', 'chat-mon3tr', 'chat-closure',
  'chat-texas', 'chat-lappland', 'chat-silence', 'chat-eyja',
  'chat-chen', 'chat-nearl', 'chat-siege',
];
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

  // 异格切换：在聊天中切换原版/异格版本
  switchAlter: (chatId: string) => {
    set((state) => {
      const chat = state.chats.find((c) => c.id === chatId);
      if (!chat) return state;
      const currentChar = state.characters.find((c) => c.id === chat.characterId);
      if (!currentChar) return state;

      // 确定目标ID
      let targetId: string | undefined;
      if (currentChar.alterId) targetId = currentChar.alterId;
      else if (currentChar.alterOf) targetId = currentChar.alterOf;
      if (!targetId) return state;

      const targetChar = state.characters.find((c) => c.id === targetId);
      if (!targetChar) return state;

      const updated = {
        chats: state.chats.map((c) =>
          c.id === chatId
            ? { ...c, characterId: targetId!, characterName: targetChar!.name, avatar: CHARACTER_AVATARS[targetId!] || targetChar!.avatar }
            : c
        ),
      };
      saveChats(updated.chats);
      return updated;
    });
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
