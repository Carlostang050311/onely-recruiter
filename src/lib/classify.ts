// 回复意图分类（规则版，零依赖）：interested / question / refused。
export type Intent = 'interested' | 'question' | 'refused';

const REFUSED = [
  'not interested',
  "don't contact",
  'do not contact',
  'stop',
  'unsubscribe',
  'no thanks',
  'no thank you',
  'remove me',
  '不要',
  '别再',
  '退订',
];
const QUESTION = ['?', 'how much', 'salary', 'pay', 'payout', 'what is', 'how does', 'requirement', '面试', '薪资', '怎么'];

export function classifyIntent(text: string): Intent {
  const t = (text || '').toLowerCase();
  if (REFUSED.some((k) => t.includes(k))) return 'refused';
  if (QUESTION.some((k) => t.includes(k))) return 'question';
  return 'interested';
}

export const INTENT_LABEL: Record<Intent, string> = {
  interested: '感兴趣',
  question: '提问',
  refused: '拒绝',
};
