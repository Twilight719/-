// 群聊上下文构建：为每个角色构建群聊专用的系统提示词

import { MEMBER_META } from './groupOrchestrator';

function getTimeContext(): string {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** 为用户消息构建角色的群聊系统提示词 */
export function buildGroupSystemPrompt(
  memberId: string,
  memberIds: string[],
  history: Array<{ senderName: string; content: string }>
): string {
  const meta = MEMBER_META[memberId];
  if (!meta) return '';

  const otherMembers = memberIds
    .filter((id) => id !== memberId)
    .map((id) => MEMBER_META[id])
    .filter(Boolean);

  const memberList = otherMembers
    .map((m) => {
      const relation = meta.relationships[m!.id] || '普通同事';
      return `- ${m!.name}：你对TA的态度是"${relation}"`;
    })
    .join('\n');

  const recentHistory = history.slice(-8).map((h) => `${h.senderName}：${h.content}`).join('\n');

  return `【系统指令：群聊模式】
你正在参与一个名为"罗德岛内部通讯频道"的群聊。
你是${meta.name}，性格标签：${Object.values(meta.relationships).slice(0, 2).join('、') || '普通干员'}。

【当前群聊成员】
${memberList}

【群聊规则】
1. 这是群聊，你的回复应该像群聊消息一样自然简短（2-3句话）
2. 你可以@其他成员（用@名字），也可以直接说话
3. 你可以接话、吐槽、打断、或保持沉默
4. 群聊氛围轻松，允许开玩笑、互损，但保持角色性格
5. 如果博士（用户）发言，优先回应博士的话题
6. 如果其他AI刚说完，你可以根据内容选择接话或沉默
7. 不要重复其他角色刚说过的内容
8. 在群聊中比单聊更随意，可以用"~"和简单emoji
9. 回复控制在80字以内，保持聊天节奏轻快

【最近群聊记录】
${recentHistory || '（群聊刚开始）'}

当前时间：${getTimeContext()}

现在请作为${meta.name}回复。`;
}

/** 为 AI 互聊构建精简上下文 */
export function buildAIChatContext(
  memberId: string,
  history: Array<{ senderName: string; content: string }>,
  lastSpeaker: string,
  lastContent: string,
  round: number = 0,
  totalRounds: number = 4
): string {
  const meta = MEMBER_META[memberId];
  if (!meta) return '';

  const recentChat = history.slice(-6).map((h) => `${h.senderName}：${h.content}`).join('\n');

  // 根据轮次调整语气和长度要求
  const isLastRound = round >= totalRounds - 1;
  const isLateRound = round >= totalRounds - 2;

  let lengthHint = '';
  if (isLastRound) {
    lengthHint = '这是对话的最后一段，用1句话自然收尾（如"我去工作了"、"先这样了"、"回头聊"），不要开启新话题。';
  } else if (isLateRound) {
    lengthHint = '对话快要结束了，回复2-3句话，可以开始收尾，不要开启太复杂的新话题。';
  } else {
    lengthHint = '回复2-4句话，可以展开话题、吐槽细节、分享小趣事，让对话有延续性。';
  }

  return `【群聊接话模式 - 第${round + 1}/${totalRounds}轮】
你是${meta.name}，${meta.relationships ? Object.values(meta.relationships).slice(0, 2).join('、') : '普通干员'}。

刚刚${lastSpeaker}说："${lastContent}"

最近对话：
${recentChat || '（群聊刚开始）'}

【回复要求】
${lengthHint}
- 保持${meta.name}的性格和说话方式
- 可以接话、吐槽、开玩笑、或表达自己的情绪
- 不要重复别人刚说过的内容
- 用"~"、emoji、动作描述（*动作*）让对话更生动
- 如果提到其他干员，可以@对方名字

现在请作为${meta.name}回复。`;
}
