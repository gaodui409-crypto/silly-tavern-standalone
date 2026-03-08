/**
 * 统一 AI 调用代理
 * 根据 apiMode 决定请求方式：proxy / preset / direct
 */

import { useDatabaseStore } from '@/stores/databaseStore';

export interface CallAIOptions {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export async function callAI(options: CallAIOptions): Promise<string> {
  const { settings } = useDatabaseStore.getState();
  const { apiConfig, apiMode } = settings;
  const { messages, signal } = options;
  const model = options.model || apiConfig.model;
  const maxTokens = options.maxTokens || apiConfig.maxTokens || 4000;
  const temperature = options.temperature ?? apiConfig.temperature ?? 0.7;

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  let requestUrl: string;
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  switch (apiMode) {
    case 'proxy': {
      if (!apiConfig.url || !apiConfig.apiKey) {
        throw new Error('后端代理模式需要配置 API 地址和密钥');
      }
      requestUrl = '/api/proxy/chat/completions';
      (body as Record<string, unknown>).target_url = apiConfig.url;
      (body as Record<string, unknown>).api_key = apiConfig.apiKey;
      break;
    }
    case 'preset': {
      requestUrl = '/api/presets/test/chat/completions';
      break;
    }
    case 'direct': {
      if (!apiConfig.url || !apiConfig.apiKey) {
        throw new Error('直连模式需要配置 API 地址和密钥');
      }
      requestUrl = `${apiConfig.url}/chat/completions`;
      headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
      break;
    }
    default:
      throw new Error(`未知的 API 模式: ${apiMode}`);
  }

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 错误 ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content;

  if (!result) {
    throw new Error('AI 未返回有效内容');
  }

  return result;
}
