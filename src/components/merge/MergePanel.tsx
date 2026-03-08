import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Merge, 
  Play, 
  Pause, 
  RotateCcw,
  Settings2,
  Save,
  Loader2,
  CheckCircle2,
  StopCircle,
  BookHeart,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { WorldbookExport } from './WorldbookExport';
import { callSummaryAPI } from '@/lib/summaryApi';
import { ConcurrentQueue } from '@/lib/aiExtractor';

export function MergePanel() {
  const { settings, setSettings, importChunks, summaryResults, setSummaryResults, diaryResults, setDiaryResults } = useDatabaseStore();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [expandedDiary, setExpandedDiary] = useState<number | null>(null);
  const queueRef = useRef<ConcurrentQueue<string> | null>(null);
  
  const mergeSettings = settings.mergeSettings;
  const chunkCount = importChunks.length;

  const updateMergeSettings = (updates: Partial<typeof mergeSettings>) => {
    setSettings({ mergeSettings: { ...mergeSettings, ...updates } });
  };

  const handleStartSummary = async () => {
    if (chunkCount === 0) { toast.error('没有可总结的分块数据'); return; }

    const startIdx = mergeSettings.startIndex - 1;
    const endIdx = mergeSettings.endIndex ? mergeSettings.endIndex : chunkCount;
    const chunksToProcess = importChunks.slice(startIdx, endIdx);
    if (chunksToProcess.length === 0) { toast.error('选定范围内没有分块数据'); return; }

    setIsSummarizing(true);
    setIsPaused(false);
    setSummaryProgress(0);

    const results: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    const queue = new ConcurrentQueue<string>(
      settings.extractionConcurrency || 3,
      (index, result) => {
        results[index] = result;
        setSummaryResults([...results.filter(Boolean)]);
        toast.success(`第 ${startIdx + index + 1} 卷总结完成`);
      },
      (completed, total) => {
        setSummaryProgress((completed / total) * 100);
      },
      (index, error) => {
        errors.push({ index, error: error.message });
        results[index] = `### 第${startIdx + index + 1}卷 - 生成失败\n\n错误: ${error.message}`;
        setSummaryResults([...results.filter(Boolean)]);
        toast.error(`第 ${startIdx + index + 1} 卷总结失败: ${error.message}`);
      }
    );
    queueRef.current = queue;

    const tasks = chunksToProcess.map((chunk, i) => {
      return async (signal: AbortSignal) => {
        return callSummaryAPI(chunk, settings, startIdx + i + 1, signal);
      };
    });

    await queue.run(tasks);
    queueRef.current = null;
    setIsSummarizing(false);
    toast.success('分卷总结完成！');
  };

  const handlePauseResume = () => {
    if (!queueRef.current) return;
    if (isPaused) { queueRef.current.resume(); setIsPaused(false); toast.info('已继续'); }
    else { queueRef.current.pause(); setIsPaused(true); toast.info('已暂停'); }
  };

  const handleCancel = () => {
    if (queueRef.current) queueRef.current.abort();
    setIsSummarizing(false);
    setIsPaused(false);
    toast.info('已取消总结');
  };

  const handleExportDiary = () => {
    if (diaryResults.length === 0) { toast.error('没有日记内容'); return; }
    const text = diaryResults.join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('日记已导出');
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📖 结果查看</h1>
          <p className="text-muted-foreground">查看总结、日记结果，导出世界书</p>
        </div>

        <div className="space-y-6">
          {/* Data Stats */}
          <Card className="card-hover border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{chunkCount}</p>
                  <p className="text-sm text-muted-foreground">已导入分块</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">{summaryResults.length}</p>
                  <p className="text-sm text-muted-foreground">已生成总结</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{diaryResults.length}</p>
                  <p className="text-sm text-muted-foreground">已生成日记</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Settings */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />总结参数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>起始分块</Label>
                  <Input type="number" value={mergeSettings.startIndex}
                    onChange={(e) => updateMergeSettings({ startIndex: parseInt(e.target.value) || 1 })}
                    min={1} max={chunkCount || 1} />
                </div>
                <div className="space-y-2">
                  <Label>终止分块</Label>
                  <Input type="number" value={mergeSettings.endIndex || ''}
                    onChange={(e) => updateMergeSettings({ endIndex: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder={`留空 = 到最后 (${chunkCount})`} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>分卷总结提示词模板</Label>
                <Textarea
                  value={mergeSettings.promptTemplate}
                  onChange={(e) => updateMergeSettings({ promptTemplate: e.target.value })}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">占位符: $CONTENT (待总结的分块文本内容)</p>
              </div>
            </CardContent>
          </Card>

          {/* Summary Control */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Merge className="w-5 h-5 text-primary" />生成总结
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
                    {isPaused ? '已暂停' : '正在生成分卷总结...'}
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                {isSummarizing && (
                  <>
                    <Button onClick={handlePauseResume} variant="outline" className="flex-1">
                      {isPaused ? <><Play className="w-4 h-4 mr-2" />继续</> : <><Pause className="w-4 h-4 mr-2" />暂停</>}
                    </Button>
                    <Button onClick={handleCancel} variant="destructive" size="icon">
                      <StopCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button onClick={handleStartSummary} disabled={isSummarizing || chunkCount === 0} className="flex-1 glow-primary">
                  {isSummarizing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在生成...</>) : (<><Play className="w-4 h-4 mr-2" />开始总结</>)}
                </Button>
                <Button variant="outline" onClick={() => { setSummaryProgress(0); setSummaryResults([]); }} disabled={isSummarizing}>
                  <RotateCcw className="w-4 h-4 mr-2" />清空
                </Button>
              </div>
              {chunkCount === 0 && <p className="text-sm text-muted-foreground text-center py-2">请先在「导入文本」页面加载并分块文本</p>}
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
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-muted/50 border prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm font-sans">{result}</pre>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diary Results */}
          {diaryResults.length > 0 && (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookHeart className="w-5 h-5 text-warning" />
                  角色日记
                  <Badge variant="secondary">{diaryResults.length} 篇</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-[400px] overflow-auto space-y-2">
                  {diaryResults.map((diary, index) => (
                    <Collapsible key={index} open={expandedDiary === index} onOpenChange={(open) => setExpandedDiary(open ? index : null)}>
                      <CollapsibleTrigger className="w-full p-3 rounded-lg bg-muted/50 border border-border/30 hover:bg-muted/80 transition-colors text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">第 {index + 1} 篇</Badge>
                            <span className="text-sm text-muted-foreground line-clamp-1">{diary.substring(0, 200)}</span>
                          </div>
                          {expandedDiary === index ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 mt-1 rounded-lg bg-background/50 border border-border/30">
                          <pre className="whitespace-pre-wrap text-sm font-sans">{diary}</pre>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleExportDiary} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />导出全部日记 (TXT)
                  </Button>
                  <Button onClick={() => { setDiaryResults([]); toast.info('日记已清空'); }} variant="outline">
                    <Trash2 className="w-4 h-4 mr-2" />清空日记
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Worldbook Export */}
          <WorldbookExport />
        </div>

        <div className="flex justify-end mt-8">
          <Button onClick={() => toast.success('设置已保存')} className="glow-primary">
            <Save className="w-4 h-4 mr-2" />保存设置
          </Button>
        </div>
      </div>
    </div>
  );
}
