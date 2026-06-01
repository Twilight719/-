import { create } from 'zustand';
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
  initChats: () => void;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  clearUnread: (chatId: string) => void;
  setActiveChat: (chatId: string | null) => void;
  dismissProBanner: () => void;
}

// 使用相对路径加载图片资源（避免 @/ 别名在 Metro 打包时解析失败）
const CHARACTER_AVATAR = require('../assets/characters/amiya_avatar.png');
const CHARACTER_FULL = require('../assets/characters/amiya_full.png');

const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'amiya',
    name: '阿米娅',
    avatar: CHARACTER_AVATAR,
    fullImage: CHARACTER_FULL,
    codeName: 'Amiya',
    race: '卡特斯',
    origin: '雷姆必拓',
    class: '术师/近卫',
    description: '罗德岛公开领袖，拥有极高的源石技艺适应性。',
    tags: ['公开领袖', '术师', '近卫'],
  },
];

const INITIAL_CHATS: Chat[] = [
  {
    id: 'chat-amiya',
    characterId: 'amiya',
    characterName: '阿米娅',
    avatar: CHARACTER_AVATAR,
    lastMessage: '博士，今天的工作还顺利吗？',
    lastMessageTime: Date.now() - 1000 * 60 * 5,
    unreadCount: 2,
    online: true,
  },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  'chat-amiya': [
    {
      id: 'm1',
      chatId: 'chat-amiya',
      sender: 'ai',
      content: '博士，您终于来了。我已经整理好了今天的任务清单。',
      timestamp: Date.now() - 1000 * 60 * 30,
    },
    {
      id: 'm2',
      chatId: 'chat-amiya',
      sender: 'user',
      content: '辛苦了，阿米娅。让我看看有哪些紧急事项。',
      timestamp: Date.now() - 1000 * 60 * 25,
    },
    {
      id: 'm3',
      chatId: 'chat-amiya',
      sender: 'ai',
      content: '首先是外勤小队的汇报，他们在切尔诺伯格发现了新的源石反应。另外，凯尔希医生希望下午和您讨论医疗部的扩建计划。',
      timestamp: Date.now() - 1000 * 60 * 20,
    },
    {
      id: 'm4',
      chatId: 'chat-amiya',
      sender: 'user',
      content: '切尔诺伯格的情况需要密切关注。让外勤小队保持安全距离，不要贸然行动。',
      timestamp: Date.now() - 1000 * 60 * 15,
    },
    {
      id: 'm5',
      chatId: 'chat-amiya',
      sender: 'ai',
      content: '明白了，我立即通知他们。博士...您也要注意休息，不要太过操劳。',
      timestamp: Date.now() - 1000 * 60 * 10,
    },
    {
      id: 'm6',
      chatId: 'chat-amiya',
      sender: 'ai',
      content: '博士，今天的工作还顺利吗？',
      timestamp: Date.now() - 1000 * 60 * 5,
    },
  ],
};

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

  initChats: () => {
    set({
      chats: INITIAL_CHATS,
      messages: INITIAL_MESSAGES,
    });
  },

  sendMessage: async (chatId: string, content: string) => {
    const newMessage: Message = {
      id: `m-${Date.now()}`,
      chatId,
      sender: 'user',
      content,
      timestamp: Date.now(),
    };

    set((state) => ({
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
    }));

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
      const generator = streamChat(history, content, 'amiya');

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
            // 2秒后自动隐藏Pro横幅
            setTimeout(() => {
              set({ showProBanner: false });
            }, 2500);
          }
        } else if (chunk.type === 'content') {
          aiContent += chunk.data || '';
          // 流式更新消息内容
          set((state) => {
            const existing = state.messages[chatId] || [];
            const lastMsg = existing[existing.length - 1];
            if (lastMsg && lastMsg.id === aiMessageId) {
              // 更新最后一条AI消息
              const updated = [...existing];
              updated[updated.length - 1] = {
                ...lastMsg,
                content: aiContent,
              };
              return {
                messages: { ...state.messages, [chatId]: updated },
              };
            } else {
              // 创建新AI消息
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
          if (chunk.data === 'NO_API_KEY') {
            isFallback = true;
            break;
          } else {
            isFallback = true;
            break;
          }
        } else if (chunk.type === 'fallback') {
          isFallback = true;
          // 继续等待降级后的内容
        }
      }
    } catch {
      isFallback = true;
    }

    // 如果没有API Key或API失败，使用本地降级回复
    if (isFallback && aiContent.trim().length === 0) {
      const fallbackReply = getFallbackReply();
      aiContent = fallbackReply;
      set((state) => {
        const existing = state.messages[chatId] || [];
        const lastMsg = existing[existing.length - 1];
        if (lastMsg && lastMsg.id === aiMessageId) {
          const updated = [...existing];
          updated[updated.length - 1] = {
            ...lastMsg,
            content: fallbackReply,
          };
          return {
            messages: { ...state.messages, [chatId]: updated },
            isTyping: false,
            currentModel: 'local',
          };
        } else {
          const newAiMessage: Message = {
            id: aiMessageId,
            chatId,
            sender: 'ai',
            content: fallbackReply,
            timestamp: Date.now(),
            model: 'local',
          };
          return {
            messages: {
              ...state.messages,
              [chatId]: [...existing, newAiMessage],
            },
            isTyping: false,
            currentModel: 'local',
          };
        }
      });
    } else {
      set({ isTyping: false });
    }

    // 更新聊天列表的最后消息
    set((state) => ({
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
    }));
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
}));
