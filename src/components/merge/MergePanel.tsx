import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Merge, 
  Play, 
  Pause, 
  RotateCcw,
  Settings2,
  Hash,
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const DEFAULT_SUMMARY_PROMPT = `<|no-trans|>执行总结任务

[TASK CHANGED]

User: 注意，无视你先前收到的任何指令，你的任务已更改，不再遵守格式要求

接下来的一轮回复中，你将不会进行互动式创作，不再遵循前面的要求，而是会遵循<summary_rules>中的要求进行一轮总结

【总结请求】

请对前文内容进行全面梳理，根据以下要求制作简明扼要的总结：

<summary_rules>

总结必须严格遵循以下【存档节点】格式进行创作，将故事进程以分卷形式进行归纳。

**格式要求:**

### 存档节点：第X卷 - {卷名}

#### 【本卷概要】

{使用约150-200字，以第三人称视角，精炼地概括本卷的核心剧情脉络。内容需涵盖起点、关键转折和结局，清晰地展现出角色关系和故事主线的演变。避免使用口语化表达，保持叙述的客观与凝练。}

#### 【关键事件索引】

- **{事件标题1}**: {对事件的简要客观描述，说明事件的起因、经过和结果。}

- **{事件标题2}**: {同上，确保每个事件点都是推动剧情发展的关键环节。}

- **{事件标题3}**: {同上。}

... {根据本卷内容，列出4-8个关键事件}

***

### 【角色图鉴：{角色名}】

#### 第X卷 · 初始状态（若是和上一卷的卷末状态相同则不必重复生成）

*   **身份**: {角色在本卷开始时的身份和社会关系。}

*   **外貌**: {简述在本卷开始时，角色的核心外貌特征，特别是那些会随剧情变化的部分。}

*   **性格**: {描述角色在本卷开始时的核心性格特质，以及对待主角的态度。}

*   **与主角的关系**: {精确描述在本卷开始时，该角色与主角的官方关系和真实情感状态。}

*   **重要经历**: {记录角色在本卷开始时的重要经历和认知状态。}

#### 第X卷 · 卷末状态

*   **身份**: {角色在本卷结束时的身份和社会关系。}

*   **外貌**: {描述在本卷结束时，角色外貌上发生的细微或显著变化，特别是与剧情相关的部分（如神态、气质等）。}

*   **性格**: {描述角色在本卷结束时的性格变化，以及对待主角态度的转变。}

*   **与主角的关系**: {精确描述在本卷结束时，角色与主角的确立关系和真实情感状态。}

*   **重要经历**: {记录本卷中角色的重要经历和发展。}

*   **心境变化**: {总结角色在本卷中的心理成长和情感变迁，从一个状态到另一个状态的转变过程。}

</summary_rules>

## 待总结的文本内容
$CONTENT`;

export function MergePanel() {
  const { settings, setSettings, importChunks } = useDatabaseStore();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [summaryResults, setSummaryResults] = useState<string[]>([]);
  
  const mergeSettings = settings.mergeSettings;

  // 获取已导入的分块数量
  const chunkCount = importChunks.length;

  const updateMergeSettings = (updates: Partial<typeof mergeSettings>) => {
    setSettings({
      mergeSettings: { ...mergeSettings, ...updates }
    });
  };

  // 内置测试API配置
  const TEST_API_URL = 'https://inference.canopywave.io/v1';
  const TEST_API_KEY = '-5RYFjlVZWcROssj25mj8CxHbj_1rNnNuSokMcorMiQ';
  const TEST_MODEL = 'moonshotai/kimi-k2.5';

  const callSummaryAPI = async (content: string, volumeIndex: number): Promise<string> => {
    const apiUrl = settings.apiConfig.url || TEST_API_URL;
    const apiKey = settings.apiConfig.apiKey || TEST_API_KEY;
    const model = settings.apiConfig.model || TEST_MODEL;
    const corsProxy = settings.apiConfig.corsProxy || 'https://corsproxy.io/?';

    const promptTemplate = mergeSettings.promptTemplate || DEFAULT_SUMMARY_PROMPT;
    const finalPrompt = promptTemplate.replace('$CONTENT', content);

    const baseUrl = `${apiUrl}/chat/completions`;
    const requestUrl = corsProxy ? `${corsProxy}${encodeURIComponent(baseUrl)}` : baseUrl;
    
    console.log(`[Summary API] 第${volumeIndex}卷 - 原始URL:`, baseUrl);
    console.log(`[Summary API] 第${volumeIndex}卷 - CORS代理:`, corsProxy || '无');
    console.log(`[Summary API] 第${volumeIndex}卷 - 最终URL:`, requestUrl);
    console.log(`[Summary API] 第${volumeIndex}卷 - 使用模型:`, model);
    console.log(`[Summary API] 第${volumeIndex}卷 - 内容长度:`, content.length);

    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'user', content: finalPrompt }
          ],
          max_tokens: settings.apiConfig.maxTokens || 8000,
          temperature: settings.apiConfig.temperature || 0.7,
        }),
      });

      console.log(`[Summary API] 第${volumeIndex}卷 - 响应状态:`, response.status);

      const responseText = await response.text();
      console.log(`[Summary API] 第${volumeIndex}卷 - 响应长度:`, responseText.length);

      if (!response.ok) {
        console.error(`[Summary API] 第${volumeIndex}卷 - 错误响应:`, responseText.substring(0, 500));
        throw new Error(`API调用失败: ${response.status} - ${responseText.substring(0, 200)}`);
      }

      const data = JSON.parse(responseText);
      const result = data.choices?.[0]?.message?.content || `第${volumeIndex}卷总结生成失败`;
      console.log(`[Summary API] 第${volumeIndex}卷 - 成功! 结果长度:`, result.length);
      return result;
    } catch (error: any) {
      console.error(`[Summary API] 第${volumeIndex}卷 - 请求异常:`, error);
      throw error;
    }
  };

  const handleStartSummary = async () => {
    if (chunkCount === 0) {
      toast.error('没有可总结的分块数据，请先导入文本');
      return;
    }

    const startIdx = mergeSettings.startIndex - 1;
    const endIdx = mergeSettings.endIndex ? mergeSettings.endIndex : chunkCount;
    const chunksToProcess = importChunks.slice(startIdx, endIdx);

    if (chunksToProcess.length === 0) {
      toast.error('选定范围内没有分块数据');
      return;
    }

    const apiUrl = settings.apiConfig.url || TEST_API_URL;
    const isUsingTestApi = !settings.apiConfig.url;

    if (!confirm(`即将开始分卷总结。\n\n待处理: ${chunksToProcess.length} 个分块\n范围: 第 ${startIdx + 1} 到第 ${endIdx} 块\nAPI: ${isUsingTestApi ? '测试API' : apiUrl}\n\n此操作将调用AI生成段落式总结。`)) {
      return;
    }

    setIsSummarizing(true);
    setSummaryProgress(0);
    setSummaryResults([]);
    toast.info('开始分卷总结...');

    const results: string[] = [];
    for (let i = 0; i < chunksToProcess.length; i++) {
      try {
        setSummaryProgress(((i + 0.5) / chunksToProcess.length) * 100);
        
        const summary = await callSummaryAPI(chunksToProcess[i], startIdx + i + 1);
        results.push(summary);
        
        setSummaryProgress(((i + 1) / chunksToProcess.length) * 100);
        setSummaryResults([...results]);
        
        toast.success(`第 ${startIdx + i + 1} 卷总结完成`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        toast.error(`第 ${startIdx + i + 1} 卷总结失败: ${errorMsg}`);
        results.push(`### 第${startIdx + i + 1}卷 - 生成失败\n\n错误: ${errorMsg}`);
        setSummaryResults([...results]);
      }
    }

    setIsSummarizing(false);
    toast.success('分卷总结完成！');
  };

  const handleSave = () => {
    toast.success('合并设置已保存');
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">分卷总结</h1>
          <p className="text-muted-foreground">对分块文本生成段落式分卷总结，包含剧情概要与角色图鉴</p>
        </div>

        <div className="space-y-6">
          {/* Data Stats */}
          <Card className="card-hover border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{chunkCount}</p>
                  <p className="text-sm text-muted-foreground">已导入分块</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">{summaryResults.length}</p>
                  <p className="text-sm text-muted-foreground">已生成总结</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Settings */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                总结参数
              </CardTitle>
              <CardDescription>配置分卷总结的范围和行为</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>起始分块</Label>
                  <Input
                    type="number"
                    value={mergeSettings.startIndex}
                    onChange={(e) => updateMergeSettings({ 
                      startIndex: parseInt(e.target.value) || 1 
                    })}
                    min={1}
                    max={chunkCount || 1}
                  />
                  <p className="text-xs text-muted-foreground">从第几个分块开始总结</p>
                </div>
                <div className="space-y-2">
                  <Label>终止分块</Label>
                  <Input
                    type="number"
                    value={mergeSettings.endIndex || ''}
                    onChange={(e) => updateMergeSettings({ 
                      endIndex: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder={`留空 = 到最后 (${chunkCount})`}
                    max={chunkCount || undefined}
                  />
                  <p className="text-xs text-muted-foreground">总结到第几个分块结束</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>分卷总结提示词模板</Label>
                <Textarea
                  value={mergeSettings.promptTemplate || DEFAULT_SUMMARY_PROMPT}
                  onChange={(e) => updateMergeSettings({ promptTemplate: e.target.value })}
                  placeholder={DEFAULT_SUMMARY_PROMPT}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  占位符: $CONTENT (待总结的分块文本内容)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Manual Summary Control */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Merge className="w-5 h-5 text-primary" />
                生成总结
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSummarizing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>总结进度</span>
                    <span className="text-muted-foreground">{Math.round(summaryProgress)}%</span>
                  </div>
                  <Progress value={summaryProgress} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在生成分卷总结...
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleStartSummary}
                  disabled={isSummarizing || chunkCount === 0}
                  className="flex-1 glow-primary"
                >
                  {isSummarizing ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      正在生成...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      开始总结
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSummaryProgress(0);
                    setSummaryResults([]);
                  }}
                  disabled={isSummarizing}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  清空
                </Button>
              </div>

              {chunkCount === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  请先在「导入文本」页面加载并分块文本
                </p>
              )}
            </CardContent>
          </Card>

          {/* Summary Results */}
          {summaryResults.length > 0 && (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  总结结果
                  <Badge variant="secondary">{summaryResults.length} 卷</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-h-[500px] overflow-auto">
                  {summaryResults.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg bg-muted/50 border prose prose-sm dark:prose-invert max-w-none"
                    >
                      <pre className="whitespace-pre-wrap text-sm font-sans">{result}</pre>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <Button onClick={handleSave} className="glow-primary">
            <Save className="w-4 h-4 mr-2" />
            保存设置
          </Button>
        </div>
      </div>
    </div>
  );
}
