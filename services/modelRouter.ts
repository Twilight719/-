import { ChatMessage } from './deepseek';

export interface RouterScore {
  topicScore: number;
  emotionScore: number;
  contextScore: number;
  triggerScore: number;
  total: number;
  reason: string;
}

const DEEP_TOPICS = [
  '特蕾西娅', '石棺', '过去', '记忆', '死亡', '为什么战斗',
  '你害怕吗', '矿石病晚期', '巴别塔', '皇女', '博士失忆',
  '阿米娅的身世', '奇美拉', '雷姆必拓', '卡特斯',
  '特雷西斯', '卡兹戴尔', '内战', '源石技艺反噬',
];

const EMOTION_WORDS = [
  '恨', '爱', '死', '杀', '痛苦', '绝望', '孤独', '想你了',
  '对不起', '谢谢', '永远', '离开', '抛弃', '背叛', '原谅',
];

const EMOTION_QUESTIONS = ['为什么', '难道不', '如果', '会怎样', '是不是', '真的吗'];

const META_WORDS = [
  '你是ai', '你是程序', '人工智能', '语言模型', 'chatgpt',
  '现实世界', '真实世界', '游戏外面', '我知道你不是真的',
];

const TRAUMA_WORDS = ['戒指', '头痛', '做梦', '琴声', '大提琴', '特雷西娅'];

export function analyzeMessage(
  userMessage: string,
  history: ChatMessage[],
  characterId: string
): RouterScore {
  const lowerMsg = userMessage.toLowerCase();
  let topicScore = 0;
  let emotionScore = 0;
  let contextScore = 0;
  let triggerScore = 0;
  const reasons: string[] = [];

  // 1. 深度话题（权重40%）
  const matchedTopics = DEEP_TOPICS.filter((t) => lowerMsg.includes(t));
  if (matchedTopics.length >= 2) {
    topicScore = 40;
    reasons.push(`深度话题命中(${matchedTopics.join(',')})`);
  } else if (matchedTopics.length === 1) {
    topicScore = 30;
    reasons.push(`深度话题命中(${matchedTopics[0]})`);
  }

  // 2. 情感强度（权重30%）
  const matchedEmotions = EMOTION_WORDS.filter((e) => lowerMsg.includes(e));
  const matchedQuestions = EMOTION_QUESTIONS.filter((q) => lowerMsg.includes(q));
  if (matchedEmotions.length >= 1) {
    emotionScore = 30;
    reasons.push(`强烈情感(${matchedEmotions.join(',')})`);
  } else if (matchedQuestions.length >= 1) {
    emotionScore = 20;
    reasons.push(`情感追问(${matchedQuestions.join(',')})`);
  }

  // 3. 对话上下文深度（权重20%）
  const roundCount = history.filter((m) => m.role === 'user').length;
  if (roundCount > 30) {
    contextScore = 20;
    reasons.push(`长对话(${roundCount}轮)`);
  } else if (roundCount > 10) {
    contextScore = 10;
    reasons.push(`中等深度(${roundCount}轮)`);
  }

  const recentHistory = history.slice(-6);
  const deepQuestions = recentHistory.filter((m) => {
    if (m.role !== 'user') return false;
    const q = m.content.toLowerCase();
    return (
      q.includes('为什么') ||
      q.includes('你觉得') ||
      (q.includes('你') && q.includes('吗'))
    );
  }).length;
  if (deepQuestions >= 3) {
    contextScore += 20;
    reasons.push('连续追问内心');
  }

  // 4. 角色特定触发（权重10%）
  const matchedMeta = META_WORDS.filter((m) => lowerMsg.includes(m));
  if (matchedMeta.length > 0) {
    triggerScore = 10;
    reasons.push('破墙测试');
  }

  if (characterId === 'amiya') {
    if (TRAUMA_WORDS.some((t) => lowerMsg.includes(t))) {
      triggerScore += 10;
      reasons.push('阿米娅创伤触发');
    }
  }

  const total = topicScore + emotionScore + contextScore + triggerScore;

  return {
    topicScore,
    emotionScore,
    contextScore,
    triggerScore,
    total,
    reason: reasons.join(' | ') || '日常对话',
  };
}

export function selectModel(score: RouterScore): {
  model: 'flash' | 'pro';
  score: number;
  reason: string;
} {
  if (score.total >= 60) {
    return {
      model: 'pro',
      score: score.total,
      reason: `Pro模式[${score.total}分]: ${score.reason}`,
    };
  }
  return {
    model: 'flash',
    score: score.total,
    reason: `Flash模式[${score.total}分]: ${score.reason}`,
  };
}
