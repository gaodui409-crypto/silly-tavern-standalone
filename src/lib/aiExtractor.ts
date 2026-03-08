/**
 * AI 角色提取器
 * 负责调用 AI 接口解析小说文本中的角色信息
 */

import type { ApiConfig } from '@/types/database';

export const DEFAULT_EXTRACTION_PROMPT = `你是一个小说分析助手。请仔细阅读以下小说文本片段，提取其中出现的角色信息。

请严格以 JSON 格式返回，不要包含任何其他文字：

{
  "protagonist": {
    "name": "主角姓名",
    "stage": "当前阶段标识（如：初入江湖/觉醒期/成长期等）",
    "identity": "身份",
    "appearance": "外貌描述",
    "personality": "性格特点",
    "status": "当前状态",
    "abilities": "能力/实力",
    "key_events": "本段关键事件",
    "mental_state": "心理状态"
  },
  "characters": [
    {
      "name": "角色姓名",
      "alias": "别名/称号",
      "gender": "性别",
      "appearance": "外貌",
      "relationship": "与主角的关系",
      "description": "角色描述",
      "significance": "重要性/作用",
      "status": "活跃/离场/死亡",
      "first_appearance": true
    }
  ]
}

如果本段中主角没有出现或没有明显变化，protagonist 字段返回 null。
如果本段中没有出现重要配角，characters 返回空数组。

## 待分析的文本

$CONTENT`;

export interface ExtractedProtagonist {
  name: string;
  stage: string;
  identity: string;
  appearance: string;
  personality: string;
  status: string;
  abilities: string;
  key_events: string;
  mental_state: string;
}

export interface ExtractedCharacter {
  name: string;
  alias: string;
  gender: string;
  appearance: string;
  relationship: string;
  description: string;
  significance: string;
  status: string;
  first_appearance: boolean;
}

export interface ExtractionResult {
  protagonist: ExtractedProtagonist | null;
  characters: ExtractedCharacter[];
}

export interface KnownCharacterSummary {
  protagonistName: string | null;
  protagonistStage: string | null;
  characterNames: { name: string; relationship: string }[];
}

/**
 * 构建已知角色摘要文本，用于追加到提示词末尾
 */
export function buildKnownCharactersSuffix(known: KnownCharacterSummary): string {
  if (!known.protagonistName && known.characterNames.length === 0) return '';
  
  let text = '\n\n## 已知角色（供参考，判断是否为同一角色的更新）\n\n';
  
  if (known.protagonistName) {
    text += `- 主角：${known.protagonistName}，当前阶段：${known.protagonistStage || '未知'}\n`;
  }
  
  if (known.characterNames.length > 0) {
    const charList = known.characterNames
      .map(c => `${c.name}（${c.relationship}）`)
      .join('、');
    text += `- 重要人物：${charList}\n`;
  }
  
  return text;
}

/**
 * 从数据表中提取已知角色信息
 */
export function extractKnownCharacters(
  protagonistContent: (string | number | null)[][],
  charactersContent: (string | number | null)[][]
): KnownCharacterSummary {
  const result: KnownCharacterSummary = {
    protagonistName: null,
    protagonistStage: null,
    characterNames: [],
  };

  // 从主角表提取（跳过表头）
  if (protagonistContent.length > 1) {
    const lastRow = protagonistContent[protagonistContent.length - 1];
    result.protagonistName = (lastRow[1] as string) || null;
    result.protagonistStage = (lastRow[2] as string) || null;
  }

  // 从人物表提取（跳过表头）
  for (let i = 1; i < charactersContent.length; i++) {
    const row = charactersContent[i];
    const name = (row[1] as string) || '';
    const relationship = (row[5] as string) || '未知';
    if (name) {
      // 去重
      if (!result.characterNames.find(c => c.name === name)) {
        result.characterNames.push({ name, relationship });
      }
    }
  }

  return result;
}

/**
 * 从 AI 响应中提取 JSON（处理可能的 markdown 代码块包裹）
 */
export function parseExtractionResponse(responseText: string): ExtractionResult | null {
  let text = responseText.trim();
  
  // 移除 markdown 代码块
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1].trim();
  }
  
  // 尝试找到第一个 { 和最后一个 }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  try {
    const data = JSON.parse(text);
    return {
      protagonist: data.protagonist || null,
      characters: Array.isArray(data.characters) ? data.characters : [],
    };
  } catch (e) {
    console.error('[AIExtractor] JSON 解析失败:', e, '\n原始文本:', text.substring(0, 200));
    return null;
  }
}

/**
 * 调用 AI 接口进行角色提取
 */
export async function callExtractionAPI(
  content: string,
  promptTemplate: string,
  knownSuffix: string,
  apiConfig: ApiConfig,
  chunkIndex: number,
  signal?: AbortSignal
): Promise<string> {
  const apiUrl = apiConfig.url;
  const apiKey = apiConfig.apiKey;
  const model = apiConfig.model;
  const corsProxy = apiConfig.corsProxy || '';

  if (!apiUrl || !apiKey) {
    throw new Error('请先配置 API 地址和密钥');
  }

  const finalPrompt = promptTemplate.replace('$CONTENT', content) + knownSuffix;
  const baseUrl = `${apiUrl}/chat/completions`;
  const requestUrl = corsProxy ? `${corsProxy}${encodeURIComponent(baseUrl)}` : baseUrl;

  console.log(`[AIExtractor] 分块 ${chunkIndex} - 开始提取，内容长度: ${content.length}`);

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: finalPrompt }],
      max_tokens: apiConfig.maxTokens || 4000,
      temperature: 0.3, // 低温度以获得更稳定的结构化输出
    }),
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

  console.log(`[AIExtractor] 分块 ${chunkIndex} - 提取完成，响应长度: ${result.length}`);
  return result;
}

/**
 * 并行任务队列 - 按顺序写入但并行请求
 */
export class ConcurrentQueue<T> {
  private running = 0;
  private results: Map<number, T> = new Map();
  private nextWriteIndex = 0;
  private _isPaused = false;
  private _isAborted = false;
  private abortController: AbortController;

  constructor(
    private concurrency: number,
    private onResult: (index: number, result: T) => void,
    private onProgress: (completed: number, total: number) => void,
    private onError: (index: number, error: Error) => void,
  ) {
    this.abortController = new AbortController();
  }

  get isPaused() { return this._isPaused; }
  get isAborted() { return this._isAborted; }

  pause() { this._isPaused = true; }
  resume() { this._isPaused = false; }
  abort() {
    this._isAborted = true;
    this.abortController.abort();
  }

  async run(tasks: Array<(signal: AbortSignal) => Promise<T>>): Promise<void> {
    const total = tasks.length;
    let completed = 0;
    let taskIndex = 0;

    const executeNext = async (): Promise<void> => {
      while (this._isPaused && !this._isAborted) {
        await new Promise(r => setTimeout(r, 200));
      }
      if (this._isAborted) return;

      if (taskIndex >= total) return;
      
      const currentIndex = taskIndex++;
      this.running++;

      try {
        const result = await tasks[currentIndex](this.abortController.signal);
        this.results.set(currentIndex, result);
        completed++;
        
        // 按顺序写入
        while (this.results.has(this.nextWriteIndex)) {
          const r = this.results.get(this.nextWriteIndex)!;
          this.onResult(this.nextWriteIndex, r);
          this.results.delete(this.nextWriteIndex);
          this.nextWriteIndex++;
        }
        
        this.onProgress(completed, total);
      } catch (error: any) {
        if (!this._isAborted) {
          completed++;
          this.onError(currentIndex, error);
          this.onProgress(completed, total);
          // Skip this index for write ordering
          this.nextWriteIndex = Math.max(this.nextWriteIndex, currentIndex + 1);
        }
      } finally {
        this.running--;
      }

      if (!this._isAborted) {
        await executeNext();
      }
    };

    // Start N concurrent workers
    const workers = Array.from(
      { length: Math.min(this.concurrency, total) },
      () => executeNext()
    );
    
    await Promise.all(workers);
  }
}
