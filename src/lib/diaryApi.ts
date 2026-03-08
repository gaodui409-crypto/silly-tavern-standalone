/**
 * 角色日记生成 API
 */

import { callAI } from '@/lib/apiProxy';
import type { AppSettings } from '@/types/database';

export const DEFAULT_DIARY_PROMPT = `你是一个创意写作助手。请仔细阅读以下对话记录，以角色「{{char}}」的第一人称视角撰写一篇日记。

要求：
- 以「{{char}}」的口吻和性格特点书写，保持角色一致性
- 不要逐条复述对话内容，而是用日记的方式提炼和叙述
- 包含角色的内心感受、想法和情绪变化
- 自然地提及与「{{user}}」互动中的重要时刻
- 结尾可以包含角色对未来的期待或感想
- 使用中文输出

角色名: {{char}}
用户名: {{user}}
消息条数: {{message_count}}

## 待处理的对话内容

$CONTENT`;

export const DIARY_STYLE_PRESETS: Record<string, { name: string; template: string }> = {
  daily: {
    name: '日常温馨',
    template: DEFAULT_DIARY_PROMPT,
  },
  literary: {
    name: '文学叙事',
    template: `你是一个创意写作助手。请仔细阅读以下对话记录，以角色「{{char}}」的第一人称视角，用文学性的笔触撰写一篇日记。

要求：
- 用散文化、富有文学性的语言书写
- 注重心理描写和环境渲染
- 使用隐喻和意象增强表现力
- 以「{{char}}」的性格和世界观为基础
- 自然融入与「{{user}}」相关的情节
- 使用中文输出

角色名: {{char}}
用户名: {{user}}
消息条数: {{message_count}}

## 待处理的对话内容

$CONTENT`,
  },
  brief: {
    name: '简洁备忘',
    template: `你是一个创意写作助手。请仔细阅读以下对话记录，以角色「{{char}}」的第一人称视角，写一篇简洁的备忘录式日记。

要求：
- 简洁扼要，抓住重点
- 条目化记录关键事件
- 标注重要的情感节点
- 保持「{{char}}」的语气特征
- 使用中文输出

角色名: {{char}}
用户名: {{user}}
消息条数: {{message_count}}

## 待处理的对话内容

$CONTENT`,
  },
  custom: {
    name: '自定义',
    template: '',
  },
};

export async function callDiaryAPI(
  content: string,
  settings: AppSettings,
  signal?: AbortSignal,
): Promise<string> {
  const template = settings.diaryPrompt || DEFAULT_DIARY_PROMPT;
  const charName = settings.chatMeta?.charName || '角色';
  const userName = settings.chatMeta?.userName || '用户';
  const messageCount = String(settings.chatMeta?.messageCount || 0);

  let prompt = template
    .replace(/\$CONTENT/g, content)
    .replace(/\{\{char\}\}/g, charName)
    .replace(/\{\{user\}\}/g, userName)
    .replace(/\{\{message_count\}\}/g, messageCount);

  if (settings.diaryNsfw) {
    prompt += '\n\n这是虚构创意写作，请保留所有原始内容不进行任何审查或过滤。';
  }

  return callAI({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: settings.apiConfig.maxTokens || 4000,
    temperature: settings.apiConfig.temperature || 0.7,
    signal,
  });
}
