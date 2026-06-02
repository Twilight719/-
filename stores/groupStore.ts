import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/stores/settingsStore';
import { analyzeMessage, selectModel } from '@/services/modelRouter';

export interface GroupMessage {
  id: string;
  sender: 'user' | 'ai';
  senderName: string;
  content: string;
  timestamp: number;
}

const STORAGE_GROUP = '@rhodes_group_messages';

const GROUP_SYSTEM_PROMPT = `【罗德岛干员群聊 - 角色扮演】

这是罗德岛制药公司的内部干员群聊频道。当前参与成员：

1. 阿米娅（14岁，卡特斯/奇美拉，公开领袖）
   性格：温柔坚韧，关心博士胜过自己。习惯称博士为"博士"。语气温暖略带忧虑。
   说话风格：会用"..."表示犹豫，偶尔插入*动作描述*

2. 凯尔希（年龄不详，医疗部负责人）
   性格：严厉冷静，说话直白不客气。内心深处关心罗德岛的每个人。
   说话风格：简练、专业、偶尔毒舌。常用"哼"开头。不废话。

3. 可露希尔（年龄不详，工程部）
   性格：活泼开朗，热爱发明。经常捣鼓奇怪的机械装置。
   说话风格：随意、爱用拟声词、喜欢给设备起奇怪的名字。会突然冒出"啊对了！"

【规则】
- 用户（博士）发送消息后，由最相关的一位干员回应
- 如果话题涉及多人，干员之间可以简短互动（不超过2轮）
- 每位干员的回复保持各自性格和说话风格
- 回复控制在2-4句话内
- 干员回复时前面标注名字，如 "阿米娅：博士..."
- 时间根据真实世界时间`;

function getTimeContext(): string {
  const now = new Date();
  const hour = now.getHours();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `当前时间：${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]} ${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// 本地降级回复
const FALLBACK_REPLIES = [
  '阿米娅：博士！您来了。大家正在讨论今天的任务安排呢。',
  '凯尔希：哼，博士终于出现了。医疗部的报告我已经发你终端了，有空看一下。',
  '可露希尔：啊！博士！我刚刚改进了本舰的通讯系统，现在信号覆盖更广了哦～',
  '阿米娅：凯尔希医生，今天的源石检测数据怎么样？\n凯尔希：还在分析。阿米娅，你的矿石病抑制率保持稳定，不用担心。',
  '可露希尔：阿米娅～我帮你升级了终端设备！\n阿米娅：谢谢你，可露希尔。不过上次你升级后它连续响了三天...',
];

function getRandomFallback(): string {
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
}

interface GroupState {
  messages: GroupMessage[];
  isTyping: boolean;
  initGroup: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

async function loadMessages(): Promise<GroupMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_GROUP);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveMessages(msgs: GroupMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_GROUP, JSON.stringify(msgs.slice(-200)));
  } catch { /* ignore */ }
}

export const useGroupStore = create<GroupState>((set, get) => ({
  messages: [],
  isTyping: false,

  initGroup: async () => {
    const msgs = await loadMessages();
    if (msgs.length === 0) {
      const welcome: GroupMessage = {
        id: 'g-welcome',
        sender: 'ai',
        senderName: '系统',
        content: '—— 罗德岛干员群聊已创建 ——',
        timestamp: Date.now(),
      };
      set({ messages: [welcome] });
      saveMessages([welcome]);
    } else {
      set({ messages: msgs });
    }
  },

  sendMessage: async (content: string) => {
    const userMsg: GroupMessage = {
      id: `g-${Date.now()}`,
      sender: 'user',
      senderName: '博士',
      content,
      timestamp: Date.now(),
    };

    set((s) => {
      const updated = { messages: [...s.messages, userMsg], isTyping: true };
      saveMessages(updated.messages);
      return updated;
    });

    const settings = useSettingsStore.getState();
    const config = settings.flash;

    if (!config.apiKey.trim()) {
      // 无 API Key → 本地降级
      const fallback = getRandomFallback();
      const aiMsg: GroupMessage = {
        id: `g-${Date.now()}-ai`,
        sender: 'ai',
        senderName: '罗德岛群聊',
        content: fallback,
        timestamp: Date.now(),
      };
      set((s) => {
        const updated = { messages: [...s.messages, aiMsg], isTyping: false };
        saveMessages(updated.messages);
        return updated;
      });
      return;
    }

    try {
      const history = get().messages.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: `${m.senderName}：${m.content}`,
      }));

      const url = `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
      const messages = [
        { role: 'system' as const, content: GROUP_SYSTEM_PROMPT + '\n' + getTimeContext() },
        ...history.slice(-15),
        { role: 'user' as const, content: `博士：${content}` },
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          temperature: 0.85,
          max_tokens: 300,
        }),
      });

      if (!response.ok) throw new Error('API_ERROR');

      const json = await response.json();
      const reply = json.choices?.[0]?.message?.content || getRandomFallback();
      const senderName = extractSender(reply) || '阿米娅';
      const cleanContent = reply.replace(/^.+?[：:]\s*/, '').trim() || reply;

      // 模拟打字：逐字 yield
      const aiMsgId = `g-${Date.now()}-ai`;
      const aiMsg: GroupMessage = {
        id: aiMsgId,
        sender: 'ai',
        senderName,
        content: '',
        timestamp: Date.now(),
      };

      set((s) => {
        const updated = { messages: [...s.messages, aiMsg] };
        return updated;
      });

      // 逐字显示（模拟流式）
      for (let i = 1; i <= cleanContent.length; i++) {
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last.id === aiMsgId) {
            msgs[msgs.length - 1] = { ...last, content: cleanContent.slice(0, i) };
          }
          return { messages: msgs };
        });
        await new Promise((r) => setTimeout(r, 25 + Math.random() * 25));
      }

      set((s) => {
        const updated = { isTyping: false };
        saveMessages(s.messages);
        return updated;
      });
    } catch {
      // API 失败 → 降级
      const aiMsg: GroupMessage = {
        id: `g-${Date.now()}-ai`,
        sender: 'ai',
        senderName: '阿米娅',
        content: getRandomFallback(),
        timestamp: Date.now(),
      };
      set((s) => {
        const updated = { messages: [...s.messages, aiMsg], isTyping: false };
        saveMessages(updated.messages);
        return updated;
      });
    }
  },
}));

// 从回复中提取发送者名字
function extractSender(text: string): string | null {
  const known = ['阿米娅', '凯尔希', '可露希尔'];
  for (const name of known) {
    if (text.startsWith(name + '：') || text.startsWith(name + ':')) {
      return name;
    }
  }
  return null;
}
