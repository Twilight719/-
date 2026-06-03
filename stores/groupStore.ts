import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/stores/settingsStore';
import { decideResponders, decideNextSpeaker, MEMBER_COLORS } from '@/services/groupOrchestrator';
import { buildGroupSystemPrompt, buildAIChatContext } from '@/services/groupContext';
import { streamChat, ChatMessage } from '@/services/deepseek';

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
  texas: '德克萨斯', texas_alter: '缄默德克萨斯',
  lappland: '拉普兰德', lappland_alter: '荒芜拉普兰德',
  silence: '赫默', silence_alter: '淬羽赫默',
  eyja: '艾雅法拉', eyja_alter: '纯烬艾雅法拉',
  chen: '陈', chen_alter: '假日威龙陈',
  nearl: '临光', nearl_alter: '耀骑士临光',
  siege: '推进之王', siege_alter: '维娜·维多利亚',
  exusiai: '新约能天使', wisadel: '维什戴尔',
};

const MEMBER_AVATARS: Record<string, ReturnType<typeof require>> = {
  amiya: require('../assets/characters/amiya_avatar.png'),
  kaltsit: require('../assets/characters/kaltsit_avatar.webp'),
  mon3tr: require('../assets/characters/mon3tr_avatar.webp'),
  closure: require('../assets/characters/closure_avatar.webp'),
  texas: require('../assets/characters/texas_avatar.webp'),
  texas_alter: require('../assets/characters/texas_alter_avatar.webp'),
  lappland: require('../assets/characters/lappland_avatar.webp'),
  lappland_alter: require('../assets/characters/lappland_alter_avatar.webp'),
  silence: require('../assets/characters/silence_avatar.webp'),
  silence_alter: require('../assets/characters/silence_alter_avatar.webp'),
  eyja: require('../assets/characters/eyja_avatar.webp'),
  eyja_alter: require('../assets/characters/eyja_alter_avatar.webp'),
  chen: require('../assets/characters/chen_avatar.webp'),
  chen_alter: require('../assets/characters/chen_alter_avatar.webp'),
  nearl: require('../assets/characters/nearl_avatar.webp'),
  nearl_alter: require('../assets/characters/nearl_alter_avatar.webp'),
  siege: require('../assets/characters/siege_avatar.webp'),
  siege_alter: require('../assets/characters/siege_alter_avatar.webp'),
  exusiai: require('../assets/characters/exusiai_avatar.webp'),
  wisadel: require('../assets/characters/wisadel_avatar.webp'),
};

// 群聊系统提示词模板
function getGroupPrompt(memberIds: string[]): string {
  const memberDescs: Record<string, string> = {
    amiya: '阿米娅：温柔坚韧的公开领袖。习惯说"博士"、"您"。语气温暖。',
    kaltsit: '凯尔希：理性冷淡的医疗部负责人。说话简练专业，常用"哼"。嘴硬心软。',
    mon3tr: 'Mon3tr：凯尔希的共生体，孩子般纯粹直率。称凯尔希为"凯尔希"，会学猫叫"喵~"。',
    closure: '可露希尔：元气工程师+奸商。喊"博士~"拉长音，三句不离推销。语速快。',
    texas: '德克萨斯：企鹅物流沉默酷girl。话极少，爱吃pocky。',
    texas_alter: '缄默德克萨斯：与过去和解的德克萨斯，话少但不再逃避。',
    lappland: '拉普兰德：叙拉古狂战士，疯狂好战，对德克萨斯有执念。',
    lappland_alter: '荒芜拉普兰德：更成熟的拉普兰德，想保护重要的人。',
    silence: '赫默：罗德岛研究员，认真内向，关心伊芙利特。',
    silence_alter: '淬羽赫默：不再畏缩的赫默，敢于对抗权威。',
    eyja: '艾雅法拉：天灾研究学者，听觉障碍，温柔认真。',
    eyja_alter: '纯烬艾雅法拉：更坚强的艾雅法拉，坦然接受一切。',
    chen: '陈：龙门近卫局督察，正直严肃火爆脾气。',
    chen_alter: '假日威龙陈：度假中的陈sir，放松偶尔笑。',
    nearl: '临光：卡西米尔骑士，正直温柔守护型。',
    nearl_alter: '耀骑士临光：经历黑暗仍选择光明的成熟临光。',
    siege: '推进之王：格拉斯哥帮领袖，自信领导力强。',
    siege_alter: '维娜·维多利亚：觉醒王室血脉的沉稳领袖。',
    exusiai: '新约能天使：拉特兰元气工程师，信仰行者，企鹅物流信使。热情元气，喜欢分享设计图纸和苹果派。',
    wisadel: '维什戴尔：新巴别塔议长，萨卡兹雇佣兵领袖。戏谑中带着威严，炸弹美学升级，为萨卡兹炸出回家的路。',
  };
  const memberList = memberIds.map((id) => memberDescs[id] || id).join('\n');
  return `【罗德岛内部群聊】
成员：${memberIds.map((id) => MEMBER_NAMES[id] || id).join('、')}

${memberList}

【严格规则 - 必须遵守】
1. 每次回复只能有一位干员发言，绝对不能让多个干员在同一条消息里说话
2. 回复格式必须是：干员名：该干员的发言内容
3. 禁止出现"X说...然后Y又说..."这种格式——那是两条消息，不是一条
4. 如果上一条是某干员说的，下一条必须换另一位干员回应
5. 每位干员只说自己的话，不要替别人说话
6. 回复1-3句话，保持各自性格`;
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// AI 互聊（最多1轮，基于关系驱动）
async function generateAIChatRound(
  groupId: string,
  lastMsg: GroupMessage,
  memberIds: string[],
  config: any
): Promise<void> {
  const next = decideNextSpeaker(lastMsg.characterId || '', lastMsg.content, memberIds);
  if (!next) return;

  const memberName = MEMBER_NAMES[next.speakerId] || next.speakerId;

  // 显示正在输入
  useGroupStore.setState((s) => ({
    typingMembers: [...new Set([...s.typingMembers, next.speakerId])],
  }));

  await delay(800 + Math.random() * 1000);

  try {
    const recentMsgs = (useGroupStore.getState().messages[groupId] || []).slice(-6).map((m) => ({
      role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `${m.senderName}：${m.content.slice(0, 100)}`,
    }));

    const context = buildAIChatContext(
      next.speakerId,
      useGroupStore.getState().messages[groupId] || [],
      lastMsg.senderName,
      lastMsg.content
    );

    const url = `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: context },
          ...recentMsgs,
        ],
        stream: false,
        temperature: 0.9,
        max_tokens: 120,
      }),
    });

    if (!response.ok) {
      useGroupStore.setState((s) => ({
        typingMembers: s.typingMembers.filter((id) => id !== next.speakerId),
      }));
      return;
    }

    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content || '';
    const clean = reply.replace(/^[^:]+[：:]\s*/, '').trim() || reply;

    const aiMsg: GroupMessage = {
      id: `g-auto-${Date.now()}`,
      groupId,
      sender: 'ai',
      senderName: memberName,
      characterId: next.speakerId,
      content: clean,
      timestamp: Date.now(),
    };

    useGroupStore.setState((s) => {
      const updated = {
        messages: { ...s.messages, [groupId]: [...(s.messages[groupId] || []), aiMsg] },
        groups: s.groups.map((g) =>
          g.id === groupId
            ? { ...g, lastMessage: memberName + '：' + clean.slice(0, 30), lastMessageTime: Date.now() }
            : g
        ),
        typingMembers: s.typingMembers.filter((id) => id !== next.speakerId),
      };
      saveAllMessages(updated.messages);
      saveGroups(updated.groups);
      return updated;
    });
  } catch {
    useGroupStore.setState((s) => ({
      typingMembers: s.typingMembers.filter((id) => id !== next.speakerId),
    }));
  }
}

// ====== Store ======
interface GroupState {
  groups: Group[];
  messages: Record<string, GroupMessage[]>;
  isTyping: boolean;
  typingGroupId: string | null;
  typingMembers: string[]; // 当前正在输入的成员ID列表
  initGroups: () => Promise<void>;
  createGroup: (name: string, memberIds: string[]) => Promise<Group>;
  addMembers: (groupId: string, memberIds: string[]) => void;
  removeMember: (groupId: string, memberId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  sendMessage: (groupId: string, content: string) => Promise<void>;
  clearUnread: (groupId: string) => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  messages: {},
  isTyping: false,
  typingGroupId: null,
  typingMembers: [],

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

    // 1. 记录用户消息
    const userMsg: GroupMessage = {
      id: `g-${Date.now()}`, groupId, sender: 'user',
      senderName: '博士', content, timestamp: Date.now(),
    };
    set((s) => ({
      messages: { ...s.messages, [groupId]: [...(s.messages[groupId] || []), userMsg] },
      isTyping: true, typingGroupId: groupId, typingMembers: [],
    }));

    const settings = useSettingsStore.getState();
    const config = settings.flash;

    // 无 API Key → 本地降级
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
          isTyping: false, typingGroupId: null, typingMembers: [],
        };
        saveAllMessages(updated.messages);
        saveGroups(updated.groups);
        return updated;
      });
      return;
    }

    try {
      // 2. 调度器决定谁回应
      const history = (get().messages[groupId] || []).map((m) => ({
        senderName: m.senderName,
        content: m.content,
      }));
      const responders = decideResponders(content, group.memberIds, history, 2);

      // 3. 依次生成回复
      for (let i = 0; i < responders.length; i++) {
        const responder = responders[i];
        const memberId = responder.speakerId;
        const memberName = MEMBER_NAMES[memberId] || memberId;

        // 显示正在输入
        set((s) => ({
          typingMembers: [...new Set([...s.typingMembers, memberId])],
        }));

        // 延迟模拟打字
        await delay(600 + Math.random() * 1200);

        const systemPrompt = buildGroupSystemPrompt(memberId, group.memberIds, history);
        const chatHistory: ChatMessage[] = history.slice(-10).map((h) => ({
          role: 'user',
          content: `${h.senderName}：${h.content}`,
        }));

        // 调用 AI（使用自定义群聊提示词）
        let aiContent = '';
        const generator = streamChat(chatHistory, content, 'amiya', systemPrompt);
        for await (const chunk of generator) {
          if (chunk.type === 'content') {
            aiContent += chunk.data || '';
          }
        }

        // 清理格式
        const cleanContent = aiContent.replace(/^[^:]+[：:]\s*/, '').trim() || aiContent;

        const aiMsg: GroupMessage = {
          id: `g-${Date.now()}-${i}`,
          groupId,
          sender: 'ai',
          senderName: memberName,
          characterId: memberId,
          content: cleanContent,
          timestamp: Date.now(),
        };

        set((s) => {
          const updated = {
            messages: { ...s.messages, [groupId]: [...(s.messages[groupId] || []), aiMsg] },
            groups: s.groups.map((g) =>
              g.id === groupId
                ? { ...g, lastMessage: memberName + '：' + cleanContent.slice(0, 30), lastMessageTime: Date.now() }
                : g
            ),
            typingMembers: s.typingMembers.filter((id) => id !== memberId),
          };
          saveAllMessages(updated.messages);
          saveGroups(updated.groups);
          return updated;
        });

        // 更新历史供下一轮使用
        history.push({ senderName: memberName, content: cleanContent });

        // 4. 最后一个回应者触发 AI 互聊（最多1轮）
        if (i === responders.length - 1 && group.memberIds.length >= 2) {
          await generateAIChatRound(groupId, aiMsg, group.memberIds, config);
        }
      }

      // 结束打字状态
      set((s) => ({
        isTyping: false, typingGroupId: null, typingMembers: [],
      }));
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
          isTyping: false, typingGroupId: null, typingMembers: [],
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

  addMembers: (groupId: string, memberIds: string[]) => {
    set((s) => {
      const updated = s.groups.map((g) => {
        if (g.id !== groupId) return g;
        const newMemberIds = [...new Set([...g.memberIds, ...memberIds])];
        const addedNames = memberIds.map((id) => MEMBER_NAMES[id] || id).join('、');
        const sysMsg: GroupMessage = {
          id: `gs-${Date.now()}`, groupId, sender: 'ai', senderName: '系统',
          content: `—— ${addedNames} 已加入群聊 ——`, timestamp: Date.now(),
        };
        return { ...g, memberIds: newMemberIds, lastMessage: sysMsg.content, lastMessageTime: Date.now() };
      });
      saveGroups(updated);
      return { groups: updated, messages: { ...s.messages } };
    });
  },

  removeMember: (groupId: string, memberId: string) => {
    set((s) => {
      const updated = s.groups.map((g) => {
        if (g.id !== groupId || g.memberIds.length <= 2) return g;
        const newMemberIds = g.memberIds.filter((id) => id !== memberId);
        const name = MEMBER_NAMES[memberId] || memberId;
        const sysMsg: GroupMessage = {
          id: `gs-${Date.now()}`, groupId, sender: 'ai', senderName: '系统',
          content: `—— ${name} 已离开群聊 ——`, timestamp: Date.now(),
        };
        return { ...g, memberIds: newMemberIds, lastMessage: sysMsg.content, lastMessageTime: Date.now() };
      });
      saveGroups(updated);
      return { groups: updated, messages: { ...s.messages } };
    });
  },

  renameGroup: (groupId: string, name: string) => {
    set((s) => {
      const updated = s.groups.map((g) =>
        g.id === groupId ? { ...g, name } : g
      );
      saveGroups(updated);
      return { groups: updated };
    });
  },
}));

function extractSender(text: string): string | null {
  const known = ['凯尔希', 'Mon3tr', '可露希尔', '阿米娅', '新约能天使', '维什戴尔'];
  return known.find((n) => text.startsWith(n + '：') || text.startsWith(n + ':')) || null;
}

export { MEMBER_NAMES, MEMBER_AVATARS, MEMBER_COLORS };
