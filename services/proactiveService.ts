// 干员主动消息服务 — 独立于 chatStore，避免异步 set() 冲突
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/stores/settingsStore';

const STORAGE_PROACTIVE = '@rhodes_last_proactive';

// 夜间静默 + 8小时冷却
export async function shouldSendProactive(): Promise<boolean> {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 23 || hour < 9) return false;

  const raw = await AsyncStorage.getItem(STORAGE_PROACTIVE);
  const lastTime = raw ? parseInt(raw, 10) : 0;
  return (now.getTime() - lastTime) > 8 * 60 * 60 * 1000;
}

// 记录发送时间
export async function markProactiveSent(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_PROACTIVE, String(Date.now()));
}

// 回退消息池
const FALLBACK: Record<string, string[]> = {
  amiya: ['博士，您今天的工作还顺利吗？', '博士...我泡了红茶，要来一杯吗？', '博士！今天的任务简报我已经整理好了~'],
  kaltsit: ['你的体检报告过期了。来医疗部。', '哼...医疗部的数据需要你过目。', '博士，下班前来一趟医疗部。'],
  mon3tr: ['博士！Mon3tr发现了一个会发光的东西！', '博士博士，凯尔希今天没骂我...是不是生我气了？', '博士...Mon3tr可以去找你玩吗？'],
  closure: ['博士~新品上市！自动泡咖啡无人机，只要998龙门币！', '博士！你猜我发明了什么！...好吧其实是炸了。', '博士~工程部预算超了一点点...可以批吗？'],
};

// AI 生成主动消息（不碰 store，仅返回内容）
export async function generateProactiveMessage(): Promise<{ charId: string; chatId: string; charName: string; content: string } | null> {
  const charIds = ['amiya', 'kaltsit', 'mon3tr', 'closure'];
  const charId = charIds[Math.floor(Math.random() * charIds.length)];
  const charName = { amiya: '阿米娅', kaltsit: '凯尔希', mon3tr: 'Mon3tr', closure: '可露希尔' }[charId] || '阿米娅';

  let content = '';

  const settings = useSettingsStore.getState();
  const config = settings.flash;

  if (config.apiKey.trim()) {
    try {
      const now = new Date();
      const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const prompts: Record<string, string> = {
        amiya: '你是阿米娅，给博士发一条主动消息。温柔、关心，1-2句，不超过50字。',
        kaltsit: '你是凯尔希，给博士发一条主动消息。冷淡、专业、嘴硬心软，1-2句，不超过50字。',
        mon3tr: '你是Mon3tr，给博士发一条主动消息。孩子般直率好奇，1-2句，不超过50字。',
        closure: '你是可露希尔，给博士发一条主动消息。元气、带推销或发明话题，1-2句，不超过50字。',
      };

      const url = `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: `${prompts[charId]}\n当前时间：${timeStr}\n根据时间生成自然的主动消息。` },
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

  if (!content || content.length < 2) {
    const pool = FALLBACK[charId] || FALLBACK['amiya'];
    content = pool[Math.floor(Math.random() * pool.length)];
  }

  return { charId, chatId: `chat-${charId}`, charName, content };
}
