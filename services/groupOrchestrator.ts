// 群聊调度器：决定谁说话、谁接话

export interface MemberMeta {
  id: string;
  name: string;
  color: string;
  triggerWords: string[];
  silenceThreshold: number;
  relationships: Record<string, string>;
}

export interface SpeakerResult {
  speakerId: string;
  reasoning: string;
  isMain: boolean;
}

export const MEMBER_COLORS: Record<string, string> = {
  amiya: '#4AABEA', kaltsit: '#D8DD5A', mon3tr: '#9C9C9C', closure: '#FF6B6B',
  texas: '#CFC2D1', texas_alter: '#B8A9C9',
  lappland: '#E0E0E0', lappland_alter: '#C8C8C8',
  silence: '#F5D76E', silence_alter: '#E8C84A',
  eyja: '#FF8C42', eyja_alter: '#E87A32',
  chen: '#4169E1', chen_alter: '#5A8AE8',
  nearl: '#FFD700', nearl_alter: '#E8C020',
  siege: '#FF4500', siege_alter: '#E04000',
  exusiai: '#FF4757', wisadel: '#DC143C',
};

export const MEMBER_META: Record<string, MemberMeta> = {
  amiya: { id: 'amiya', name: '阿米娅', color: MEMBER_COLORS.amiya, triggerWords: ['阿米娅', '博士', '任务', '罗德岛', '大家', '休息', '矿石病', '源石'], silenceThreshold: 0.3, relationships: { kaltsit: '尊敬依赖', closure: '温柔姐姐', mon3tr: '好奇友好', texas: '关心' } },
  kaltsit: { id: 'kaltsit', name: '凯尔希', color: MEMBER_COLORS.kaltsit, triggerWords: ['凯尔希', '医疗', '休息', '体检', '健康', 'Mon3tr', '文件'], silenceThreshold: 0.5, relationships: { amiya: '严厉关心', closure: '镇压对象', mon3tr: '共生体' } },
  mon3tr: { id: 'mon3tr', name: 'Mon3tr', color: MEMBER_COLORS.mon3tr, triggerWords: ['Mon3tr', '凯尔希', '抱抱', '好玩', '奇怪', '气息'], silenceThreshold: 0.4, relationships: { kaltsit: '绝对依恋', amiya: '喜欢', closure: '好奇' } },
  closure: { id: 'closure', name: '可露希尔', color: MEMBER_COLORS.closure, triggerWords: ['可露希尔', '买东西', '工程', '炸弹', '装置', '折扣', '新品', '预算'], silenceThreshold: 0.1, relationships: { kaltsit: '秒怂', amiya: '宠溺', texas: '想摸脊刺' } },
  texas: { id: 'texas', name: '德克萨斯', color: MEMBER_COLORS.texas, triggerWords: ['德克萨斯', 'pocky', '企鹅物流', '任务', '沉默', '酒'], silenceThreshold: 0.7, relationships: { exusiai: '无奈损友', lappland: '回避', closure: '无感' } },
  texas_alter: { id: 'texas_alter', name: '缄默德克萨斯', color: MEMBER_COLORS.texas_alter, triggerWords: ['缄默德克萨斯', '德克萨斯', 'pocky', '企鹅物流', '家族', '叙拉古'], silenceThreshold: 0.6, relationships: { lappland_alter: '复杂羁绊' } },
  lappland: { id: 'lappland', name: '拉普兰德', color: MEMBER_COLORS.lappland, triggerWords: ['拉普兰德', '哈哈哈', '战斗', '德克萨斯', '叙拉古'], silenceThreshold: 0.4, relationships: { texas: '执念', lappland_alter: '自己' } },
  lappland_alter: { id: 'lappland_alter', name: '荒芜拉普兰德', color: MEMBER_COLORS.lappland_alter, triggerWords: ['荒芜拉普兰德', '拉普兰德', '德克萨斯', '叙拉古', '保护'], silenceThreshold: 0.5, relationships: { texas_alter: '羁绊' } },
  silence: { id: 'silence', name: '赫默', color: MEMBER_COLORS.silence, triggerWords: ['赫默', '研究', '科研', '伊芙利特', '莱茵生命', '数据'], silenceThreshold: 0.5, relationships: { silence_alter: '过去的自己' } },
  silence_alter: { id: 'silence_alter', name: '淬羽赫默', color: MEMBER_COLORS.silence_alter, triggerWords: ['淬羽赫默', '赫默', '伊芙利特', '科研', '权威', '对抗'], silenceThreshold: 0.4, relationships: { silence: '过去的自己' } },
  eyja: { id: 'eyja', name: '艾雅法拉', color: MEMBER_COLORS.eyja, triggerWords: ['艾雅法拉', '天灾', '火山', '研究', '学术', '论文'], silenceThreshold: 0.5, relationships: { eyja_alter: '过去的自己' } },
  eyja_alter: { id: 'eyja_alter', name: '纯烬艾雅法拉', color: MEMBER_COLORS.eyja_alter, triggerWords: ['纯烬艾雅法拉', '艾雅法拉', '天灾', '火山', '灰烬'], silenceThreshold: 0.4, relationships: { eyja: '过去的自己' } },
  chen: { id: 'chen', name: '陈', color: MEMBER_COLORS.chen, triggerWords: ['陈', '龙门', '近卫局', '赤霄', '督察', '诗怀雅'], silenceThreshold: 0.5, relationships: { chen_alter: '度假的自己' } },
  chen_alter: { id: 'chen_alter', name: '假日威龙陈', color: MEMBER_COLORS.chen_alter, triggerWords: ['假日威龙陈', '陈', '度假', '水枪', '龙'], silenceThreshold: 0.5, relationships: { chen: '工作的自己' } },
  nearl: { id: 'nearl', name: '临光', color: MEMBER_COLORS.nearl, triggerWords: ['临光', '骑士', '卡西米尔', '耀骑士', '光芒'], silenceThreshold: 0.5, relationships: { nearl_alter: '另一个自己' } },
  nearl_alter: { id: 'nearl_alter', name: '耀骑士临光', color: MEMBER_COLORS.nearl_alter, triggerWords: ['耀骑士临光', '临光', '骑士', '卡西米尔', '光芒'], silenceThreshold: 0.5, relationships: { nearl: '另一个自己' } },
  siege: { id: 'siege', name: '推进之王', color: MEMBER_COLORS.siege, triggerWords: ['推进之王', '格拉斯哥帮', '维多利亚', '维娜', '拳头'], silenceThreshold: 0.4, relationships: { siege_alter: '觉醒的自己' } },
  siege_alter: { id: 'siege_alter', name: '维娜·维多利亚', color: MEMBER_COLORS.siege_alter, triggerWords: ['维娜', '维多利亚', '王室', '王位', '推进之王'], silenceThreshold: 0.5, relationships: { siege: '过去的自己' } },
  exusiai: { id: 'exusiai', name: '新约能天使', color: MEMBER_COLORS.exusiai, triggerWords: ['新约能天使', '能天使', '苹果派', '拉特兰', '铳械', '弹药', '德克萨斯', '告解车'], silenceThreshold: 0.2, relationships: { texas: '最佳损友', amiya: '喜欢', wisadel: '警惕' } },
  wisadel: { id: 'wisadel', name: '维什戴尔', color: MEMBER_COLORS.wisadel, triggerWords: ['维什戴尔', 'W', '炸弹', '爆炸', '巴别塔', '特蕾西娅', '萨卡兹', '议长'], silenceThreshold: 0.4, relationships: { kaltsit: '保持距离', amiya: '戏谑', closure: '竞争' } },
};

// 话题热度
const TOPIC_HEAT: Record<string, { heat: number; members: string[] }> = {
  '任务': { heat: 15, members: ['amiya', 'kaltsit', 'texas', 'siege'] },
  '炸弹': { heat: 20, members: ['wisadel', 'closure'] },
  'pocky': { heat: 15, members: ['texas', 'exusiai'] },
  '凯尔希': { heat: 20, members: ['mon3tr', 'closure', 'kaltsit', 'wisadel'] },
  '休息': { heat: 10, members: ['kaltsit', 'amiya'] },
  '买东西': { heat: 25, members: ['closure'] },
  '苹果派': { heat: 15, members: ['exusiai'] },
  '医疗': { heat: 15, members: ['kaltsit', 'amiya', 'silence', 'silence_alter'] },
  '工程': { heat: 15, members: ['closure', 'exusiai'] },
  '叙拉古': { heat: 20, members: ['texas', 'texas_alter', 'lappland', 'lappland_alter'] },
  '拉特兰': { heat: 15, members: ['exusiai'] },
  '卡西米尔': { heat: 15, members: ['nearl', 'nearl_alter'] },
  '维多利亚': { heat: 15, members: ['siege', 'siege_alter'] },
  '萨卡兹': { heat: 15, members: ['wisadel'] },
  '天灾': { heat: 15, members: ['eyja', 'eyja_alter'] },
  '火山': { heat: 15, members: ['eyja', 'eyja_alter'] },
  '博士': { heat: 10, members: ['amiya', 'kaltsit', 'mon3tr', 'closure'] },
};

/** 决定谁回应用户消息 */
export function decideResponders(
  userMessage: string,
  memberIds: string[],
  history: Array<{ senderName: string; content: string }>,
  maxResponders: number = 2
): SpeakerResult[] {
  const scores = memberIds.map((id) => {
    const meta = MEMBER_META[id];
    if (!meta) return { id, score: 0, reasons: [] as string[] };

    let score = 0;
    const reasons: string[] = [];

    // 1. 被直接点名（权重最高）
    if (userMessage.includes(meta.name)) {
      score += 50;
      reasons.push('被博士点名');
    }

    // 2. 关键词匹配
    const matched = meta.triggerWords.filter((w) => userMessage.includes(w));
    if (matched.length > 0) {
      score += matched.length * 15;
      reasons.push(`关键词匹配(${matched.join(',')})`);
    }

    // 3. 性格活跃度
    const activityScore = (1 - meta.silenceThreshold) * 10;
    score += activityScore;
    if (activityScore > 5) reasons.push('性格活跃');

    // 4. 历史发言频率惩罚（避免某人话太多）
    const recentCount = history.slice(-8).filter((h) => h.senderName === meta.name).length;
    const penalty = recentCount * 8;
    score -= penalty;
    if (penalty > 0) reasons.push(`话多惩罚(-${penalty})`);

    // 5. 话题热度
    let topicHeat = 0;
    for (const [keyword, data] of Object.entries(TOPIC_HEAT)) {
      if (userMessage.includes(keyword) && data.members.includes(id)) {
        topicHeat += data.heat;
      }
    }
    score += topicHeat;
    if (topicHeat > 0) reasons.push(`话题热度(+${topicHeat})`);

    return { id, score: Math.max(0, score), reasons };
  });

  scores.sort((a, b) => b.score - a.score);

  const results: SpeakerResult[] = [];

  // 主回应者（分数必须>20）
  if (scores[0].score > 20) {
    results.push({
      speakerId: scores[0].id,
      reasoning: `主回应：${scores[0].reasons.join(' | ')}(${scores[0].score}分)`,
      isMain: true,
    });
  }

  // 副回应者（分数>15，且与主回应分差<30）
  if (scores.length > 1 && scores[1].score > 15 && scores[0].score - scores[1].score < 30) {
    results.push({
      speakerId: scores[1].id,
      reasoning: `副回应：${scores[1].reasons.join(' | ')}(${scores[1].score}分)`,
      isMain: false,
    });
  }

  // 保底机制：如果没人达标，随机选活跃角色
  if (results.length === 0) {
    const active = memberIds.filter((id) => (MEMBER_META[id]?.silenceThreshold || 0.5) < 0.6);
    const random = active[Math.floor(Math.random() * active.length)] || memberIds[0];
    results.push({
      speakerId: random,
      reasoning: '保底随机：话题不匹配，选活跃角色接话',
      isMain: true,
    });
  }

  return results.slice(0, maxResponders);
}

/** AI 之间互聊的下一个说话者 */
export function decideNextSpeaker(
  lastSenderId: string,
  lastContent: string,
  memberIds: string[],
  round: number = 0,
  totalRounds: number = 4,
): { speakerId: string; reasoning: string } | null {
  // 越到后期越不容易接话，让对话自然结束
  const roundDecay = Math.max(0, round * 0.15); // 每轮降低15%接话概率

  // 1. 被点名必回（高概率，随轮次衰减）
  const mentioned = memberIds.find((id) => {
    const meta = MEMBER_META[id];
    return meta && lastContent.includes(meta.name) && id !== lastSenderId;
  });
  if (mentioned && Math.random() > (0.2 + roundDecay)) {
    return {
      speakerId: mentioned,
      reasoning: `被${MEMBER_META[lastSenderId]?.name || ''}点名，回应`,
    };
  }

  // 2. 关系驱动的互动（概率随轮次衰减）
  const relationshipTriggers: Record<string, Array<{ target: string; prob: number; reason: string }>> = {
    exusiai: [{ target: 'texas', prob: 0.7, reason: '能天使说完，德克萨斯吐槽' }],
    texas: [{ target: 'exusiai', prob: 0.5, reason: '德克萨斯说完，能天使接茬' }],
    closure: [{ target: 'kaltsit', prob: 0.6, reason: '可露希尔说完，凯尔希镇压' }],
    kaltsit: [{ target: 'closure', prob: 0.4, reason: '凯尔希说完，可露希尔秒怂' }],
    amiya: [{ target: 'kaltsit', prob: 0.4, reason: '阿米娅说完，凯尔希关心' }],
    wisadel: [{ target: 'kaltsit', prob: 0.5, reason: '维什戴尔说完，凯尔希警告' }],
    lappland: [{ target: 'texas', prob: 0.6, reason: '拉普兰德念叨德克萨斯' }],
    lappland_alter: [{ target: 'texas_alter', prob: 0.5, reason: '荒芜拉普兰德关心德克萨斯' }],
    mon3tr: [{ target: 'kaltsit', prob: 0.6, reason: 'Mon3tr找凯尔希' }],
    texas_alter: [{ target: 'lappland_alter', prob: 0.3, reason: '缄默德克萨斯回应拉普兰德' }],
    silence: [{ target: 'silence_alter', prob: 0.3, reason: '赫默自言自语' }],
  };

  const triggers = relationshipTriggers[lastSenderId];
  if (triggers) {
    for (const t of triggers) {
      const adjustedProb = Math.max(0, t.prob - roundDecay);
      if (memberIds.includes(t.target) && Math.random() < adjustedProb) {
        return { speakerId: t.target, reasoning: t.reason };
      }
    }
  }

  // 3. 话题延续（概率随轮次衰减，前期高后期低）
  const baseRandomProb = 0.7 - roundDecay; // 基础70%，每轮降15%
  if (Math.random() < baseRandomProb) {
    const others = memberIds.filter((id) => id !== lastSenderId);
    const random = others[Math.floor(Math.random() * others.length)];
    if (random) {
      return { speakerId: random, reasoning: '话题延续，随机接话' };
    }
  }

  // 默认沉默
  return null;
}
