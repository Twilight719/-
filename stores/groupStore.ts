import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/stores/settingsStore';

export interface Group {
  id: string;
  name: string;
  memberIds: string[];  // character ids, e.g. ['amiya', 'kaltsit']
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  createdAt: number;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  sender: 'user' | 'ai';
  senderName: string;
  characterId?: string; // which character sent this
  content: string;
  timestamp: number;
}

const STORAGE_GROUPS = '@rhodes_groups_v2';
const STORAGE_GROUP_MSGS = '@rhodes_group_msgs_v2';

const MEMBER_NAMES: Record<string, string> = {
  amiya: '阿米娅', kaltsit: '凯尔希', mon3tr: 'Mon3tr', closure: '可露希尔',
};

const MEMBER_AVATARS: Record<string, ReturnType<typeof require>> = {
  amiya: require('../assets/characters/amiya_avatar.png'),
  kaltsit: require('../assets/characters/kaltsit_avatar.webp'),
  mon3tr: require('../assets/characters/mon3tr_avatar.webp'),
  closure: require('../assets/characters/closure_avatar.webp'),
};

// 群聊系统提示词模板
function getGroupPrompt(memberIds: string[]): string {
  const memberDescs: Record<string, string> = {
    amiya: '阿米娅：温柔坚韧的公开领袖。习惯说"博士"、"您"。语气温暖。',
    kaltsit: '凯尔希：理性冷淡的医疗部负责人。说话简练专业，常用"哼"。嘴硬心软。',
    mon3tr: 'Mon3tr：凯尔希的共生体，孩子般纯粹直率。称凯尔希为"凯尔希"，会学猫叫"喵~"。',
    closure: '可露希尔：元气工程师+奸商。喊"博士~"拉长音，三句不离推销。语速快。',
  };
  const memberList = memberIds.map((id) => memberDescs[id] || id).join('\n');
  return `【罗德岛内部群聊】
成员：${memberIds.map((id) => MEMBER_NAMES[id] || id).join('、')}

${memberList}

规则：
- 用户（博士）发言后，由最相关的一位成员回应
- 成员间可简短互动（不超过2轮）
- 回复格式：角色名：内容
- 回复2-4句，保持各自性格`;
}

function getTimeContext(): string {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// 默认群聊
const DEFAULT_GROUP: Group = {
  id: 'group-default',
  name: '罗德岛作战会议室',
  memberIds: ['amiya', 'kaltsit', 'closure'],
  lastMessage: '—— 群聊已创建 ——',
  lastMessageTime: Date.now(),
  unreadCount: 0,
  createdAt: Date.now(),
};

// ====== 持久化 ======
async function saveGroups(groups: Group[]): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_GROUPS, JSON.stringify(groups)); } catch {}
}
async function loadGroups(): Promise<Group[]> {
  try { const raw = await AsyncStorage.getItem(STORAGE_GROUPS); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
async function saveAllMessages(msgs: Record<string, GroupMessage[]>): Promise<void> {
  try {
    const trimmed: Record<string, GroupMessage[]> = {};
    for (const [k, v] of Object.entries(msgs)) trimmed[k] = v.slice(-200);
    await AsyncStorage.setItem(STORAGE_GROUP_MSGS, JSON.stringify(trimmed));
  } catch {}
}
async function loadAllMessages(): Promise<Record<string, GroupMessage[]>> {
  try { const raw = await AsyncStorage.getItem(STORAGE_GROUP_MSGS); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

// ====== Store ======
interface GroupState {
  groups: Group[];
  messages: Record<string, GroupMessage[]>;
  isTyping: boolean;
  typingGroupId: string | null;
  initGroups: () => Promise<void>;
  createGroup: (name: string, memberIds: string[]) => Promise<Group>;
  sendMessage: (groupId: string, content: string) => Promise<void>;
  clearUnread: (groupId: string) => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  messages: {},
  isTyping: false,
  typingGroupId: null,

  initGroups: async () => {
    let groups = await loadGroups();
    const msgs = await loadAllMessages();
    if (groups.length === 0) {
      const welcome: GroupMessage = {
        id: 'g-welcome', groupId: DEFAULT_GROUP.id, sender: 'ai',
        senderName: '系统', content: '—— 罗德岛作战会议室 ——',
        timestamp: Date.now(),
      };
      groups = [DEFAULT_GROUP];
      msgs[DEFAULT_GROUP.id] = [welcome];
      await saveGroups(groups);
      await saveAllMessages(msgs);
    }
    set({ groups, messages: msgs });
  },

  createGroup: async (name: string, memberIds: string[]) => {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: name || `${memberIds.map((id) => MEMBER_NAMES[id]).join('、')}的群聊`,
      memberIds,
      lastMessage: '群聊已创建',
      lastMessageTime: Date.now(),
      unreadCount: 0,
      createdAt: Date.now(),
    };
    const welcome: GroupMessage = {
      id: `gw-${Date.now()}`, groupId: newGroup.id, sender: 'ai',
      senderName: '系统',
      content: `—— ${newGroup.name} ——`,
      timestamp: Date.now(),
    };
    set((s) => {
      const updated = {
        groups: [newGroup, ...s.groups],
        messages: { ...s.messages, [newGroup.id]: [welcome] },
      };
      saveGroups(updated.groups);
      saveAllMessages(updated.messages);
      return updated;
    });
    return newGroup;
  },

  sendMessage: async (groupId: string, content: string) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return;

    const userMsg: GroupMessage = {
      id: `g-${Date.now()}`, groupId, sender: 'user',
      senderName: '博士', content, timestamp: Date.now(),
    };
    set((s) => {
      const updated = {
        messages: { ...s.messages, [groupId]: [...(s.messages[groupId] || []), userMsg] },
        isTyping: true, typingGroupId: groupId,
      };
      return updated;
    });

    const settings = useSettingsStore.getState();
    const config = settings.flash;

    if (!config.apiKey.trim()) {
      const aiMsg: GroupMessage = {
        id: `g-${Date.now()}-ai`, groupId, sender: 'ai',
        senderName: '阿米娅', characterId: 'amiya',
        content: '阿米娅：博士，群聊已收到您的消息。请配置 API Key 后使用 AI 群聊功能。',
        timestamp: Date.now(),
      };
      set((s) => {
        const updated = {
          messages: { ...s.messages, [groupId]: [...(s.messages[groupId] || []), aiMsg] },
          groups: s.groups.map((g) => g.id === groupId ? { ...g, lastMessage: aiMsg.content, lastMessageTime: Date.now() } : g),
          isTyping: false, typingGroupId: null,
        };
        saveAllMessages(updated.messages);
        saveGroups(updated.groups);
        return updated;
      });
      return;
    }

    try {
      const history = (get().messages[groupId] || []).map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `${m.senderName}：${m.content}`,
      }));
      const url = `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
      const messages = [
        { role: 'system' as const, content: getGroupPrompt(group.memberIds) + '\n当前时间：' + getTimeContext() },
        ...history.slice(-15),
        { role: 'user' as const, content: `博士：${content}` },
      ];
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages, stream: false, temperature: 0.85, max_tokens: 300 }),
      });
      if (!response.ok) throw new Error('API_ERROR');
      const json = await response.json();
      const reply = json.choices?.[0]?.message?.content || '';
      const senderName = extractSender(reply) || (MEMBER_NAMES[group.memberIds[0]] || '阿米娅');
      const clean = reply.replace(/^.+?[：:]\s*/, '').trim() || reply;

      const aiMsgId = `g-${Date.now()}-ai`;
      const aiMsg: GroupMessage = {
        id: aiMsgId, groupId, sender: 'ai', senderName,
        characterId: group.memberIds.find((id) => MEMBER_NAMES[id] === senderName),
        content: '', timestamp: Date.now(),
      };
      set((s) => ({ messages: { ...s.messages, [groupId]: [...(s.messages[groupId] || []), aiMsg] } }));

      // 打字机逐字
      for (let i = 1; i <= clean.length; i++) {
        set((s) => {
          const msgs = [...(s.messages[groupId] || [])];
          const last = msgs[msgs.length - 1];
          if (last.id === aiMsgId) msgs[msgs.length - 1] = { ...last, content: clean.slice(0, i) };
          return { messages: { ...s.messages, [groupId]: msgs } };
        });
        await new Promise((r) => setTimeout(r, 25 + Math.random() * 25));
      }

      set((s) => {
        const finalContent = senderName + '：' + clean;
        return {
          groups: s.groups.map((g) => g.id === groupId ? { ...g, lastMessage: finalContent.slice(0, 50), lastMessageTime: Date.now() } : g),
          isTyping: false, typingGroupId: null,
        };
      });
      saveAllMessages(get().messages);
      saveGroups(get().groups);
    } catch {
      const aiMsg: GroupMessage = {
        id: `g-${Date.now()}-ai`, groupId, sender: 'ai',
        senderName: '阿米娅', characterId: 'amiya',
        content: '阿米娅：博士...通讯好像有点问题。请稍后再试。',
        timestamp: Date.now(),
      };
      set((s) => {
        const updated = {
          messages: { ...s.messages, [groupId]: [...(s.messages[groupId] || []), aiMsg] },
          groups: s.groups.map((g) => g.id === groupId ? { ...g, lastMessage: aiMsg.content, lastMessageTime: Date.now() } : g),
          isTyping: false, typingGroupId: null,
        };
        saveAllMessages(updated.messages);
        saveGroups(updated.groups);
        return updated;
      });
    }
  },

  clearUnread: (groupId: string) => {
    set((s) => ({ groups: s.groups.map((g) => g.id === groupId ? { ...g, unreadCount: 0 } : g) }));
  },
}));

function extractSender(text: string): string | null {
  const known = ['凯尔希', 'Mon3tr', '可露希尔', '阿米娅'];
  return known.find((n) => text.startsWith(n + '：') || text.startsWith(n + ':')) || null;
}

export { MEMBER_NAMES, MEMBER_AVATARS };
