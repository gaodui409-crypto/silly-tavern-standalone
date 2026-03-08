import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FileUp, 
  Upload, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Sparkles,
  Eye,
  ClipboardPaste,
  Zap,
  X,
  MessageSquare,
  Bot,
  Merge,
  BookHeart,
  StopCircle
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ImportChunk, ImportStatus, TaskType, ChatMeta } from '@/types/database';
import { SAMPLE_NOVEL, SAMPLE_CHARACTERS } from '@/data/sampleNovel';
import {
  callExtractionAPI,
  parseExtractionResponse,
  extractKnownCharacters,
  buildKnownCharactersSuffix,
  ConcurrentQueue,
  type ExtractionResult,
} from '@/lib/aiExtractor';
import { callSummaryAPI } from '@/lib/summaryApi';
import { callDiaryAPI } from '@/lib/diaryApi';

export function ImportPanel() {
  const { settings, setSettings, database, addRow, updateRow, setCurrentSheet, setImportChunks, setSummaryResults, setDiaryResults } = useDatabaseStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [chunks, setChunks] = useState<ImportChunk[]>([]);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isSampleData, setIsSampleData] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [viewingChunk, setViewingChunk] = useState<number | null>(null);
  const [errors, setErrors] = useState<Array<{ index: number; error: string }>>([]);
  const queueRef = useRef<ConcurrentQueue<any> | null>(null);

  const inputSourceType = settings.inputSourceType || 'novel';
  const taskType = settings.taskType || 'extraction';

  const sortedSheets = Object.entries(database)
    .map(([key, sheet]) => ({ key, ...sheet }))
    .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));

  const splitContent = useCallback((content: string) => {
    const splitSize = settings.importSplitSize || 10000;
    const newChunks: ImportChunk[] = [];
    for (let i = 0; i < content.length; i += splitSize) {
      newChunks.push({
        content: content.substring(i, i + splitSize),
        index: newChunks.length,
      });
    }
    return newChunks;
  }, [settings.importSplitSize]);

  const splitChatMessages = useCallback((lines: string[]) => {
    const segSize = settings.chatSegmentSize || 50;
    const overlap = settings.chatOverlap || 5;
    const newChunks: ImportChunk[] = [];
    for (let i = 0; i < lines.length; i += (segSize - overlap)) {
      const segment = lines.slice(i, i + segSize);
      if (segment.length === 0) break;
      newChunks.push({
        content: segment.join('\n'),
        index: newChunks.length,
      });
      if (i + segSize >= lines.length) break;
    }
    return newChunks;
  }, [settings.chatSegmentSize, settings.chatOverlap]);

  const loadContent = useCallback((content: string, isSample: boolean) => {
    const newChunks = splitContent(content);
    setChunks(newChunks);
    setImportChunks(newChunks.map(c => c.content));
    setStatus({ total: newChunks.length, currentIndex: 0 });
    setPreviewContent(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
    setIsSampleData(isSample);
    setErrors([]);
    if (isSample) {
      setSelectedTables(['sheet_protagonist', 'sheet_characters']);
    }
    return newChunks;
  }, [splitContent, setImportChunks]);

  // === File handlers ===
  const handleLoadSample = () => {
    loadContent(SAMPLE_NOVEL, true);
    toast.success(`示例小说已加载（${SAMPLE_NOVEL.length} 字），可直接点击"开始注入"查看效果`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) { toast.error('文件为空或读取失败'); return; }

      if (inputSourceType === 'chat' && file.name.endsWith('.jsonl')) {
        // Parse JSONL chat format
        const lines = content.trim().split('\n');
        const parsedMessages: string[] = [];
        let meta: ChatMeta | null = null;

        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            if (!meta && (msg.user_name || msg.character_name)) {
              meta = {
                userName: msg.user_name || msg.name || '用户',
                charName: msg.character_name || msg.char || '角色',
                messageCount: lines.length,
                totalChars: content.length,
              };
            }
            const name = msg.name || msg.role || '未知';
            const mes = msg.mes || msg.message || msg.content || '';
            parsedMessages.push(`${name}: ${mes}`);
          } catch {
            parsedMessages.push(line);
          }
        }

        if (meta) {
          setSettings({ chatMeta: meta });
        }

        const newChunks = splitChatMessages(parsedMessages);
        setChunks(newChunks);
        setImportChunks(newChunks.map(c => c.content));
        setStatus({ total: newChunks.length, currentIndex: 0 });
        setPreviewContent(parsedMessages.slice(0, 10).join('\n'));
        setIsSampleData(false);
        setErrors([]);
        toast.success(`聊天记录已拆分为 ${newChunks.length} 段 (${parsedMessages.length} 条消息)`);
      } else {
        const newChunks = loadContent(content, false);
        toast.success(`文件已拆分为 ${newChunks.length} 个部分`);
      }
    };
    reader.onerror = () => toast.error('读取文件时出错');
    reader.readAsText(file, 'UTF-8');
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) { toast.error('请粘贴文本内容'); return; }
    const newChunks = loadContent(pasteText.trim(), false);
    setPasteMode(false);
    setPasteText('');
    toast.success(`文本已拆分为 ${newChunks.length} 个部分`);
  };

  // === Drag & Drop ===
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const newChunks = loadContent(content, false);
        toast.success(`文件已拆分为 ${newChunks.length} 个部分`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }, [loadContent]);

  // === Sample data injection ===
  const injectSampleData = async () => {
    const { protagonist, importantCharacters } = SAMPLE_CHARACTERS;
    if (selectedTables.includes('sheet_protagonist')) {
      for (let i = 0; i < protagonist.stages.length; i++) {
        const stage = protagonist.stages[i];
        await new Promise(resolve => setTimeout(resolve, 300));
        addRow('sheet_protagonist', {
          "1": protagonist.name, "2": stage.stage,
          "3": i === 0 ? '男/23岁' : (i === 4 ? '男/25岁' : '男/23-24岁'),
          "4": '俊秀面容，气质从容', "5": stage.status,
          "6": stage.description, "7": stage.keyEvents || stage.mentalState || '',
          "8": i === 0 ? '' : `【变化】${stage.abilities}`
        });
        setStatus({ total: chunks.length, currentIndex: i + 1 });
      }
    }
    if (selectedTables.includes('sheet_characters')) {
      for (let i = 0; i < importantCharacters.length; i++) {
        const char = importantCharacters[i];
        await new Promise(resolve => setTimeout(resolve, 200));
        addRow('sheet_characters', {
          "1": char.name, "2": char.alias !== '无' ? char.alias : '初登场',
          "3": char.abilities?.includes('斗') ? '男' : '女',
          "4": char.description.substring(0, 50), "5": char.relationship,
          "6": char.description, "7": char.significance || '',
          "8": char.status === '活跃' ? '' : `【${char.status}】`
        });
      }
    }
  };

  // === AI Extraction - write result to database ===
  const writeExtractionResult = (result: ExtractionResult) => {
    if (result.protagonist && selectedTables.includes('sheet_protagonist')) {
      const p = result.protagonist;
      const protagonistContent = database['sheet_protagonist']?.content || [[]];
      const lastRow = protagonistContent.length > 1 ? protagonistContent[protagonistContent.length - 1] : null;
      const lastStage = lastRow ? (lastRow[2] as string) : '';
      
      if (!lastRow || lastStage !== p.stage) {
        addRow('sheet_protagonist', {
          "1": p.name, "2": p.stage, "3": '', "4": p.appearance,
          "5": p.identity, "6": p.personality,
          "7": p.key_events, "8": p.abilities ? `【变化】${p.abilities}` : ''
        });
      }
    }

    if (result.characters.length > 0 && selectedTables.includes('sheet_characters')) {
      for (const char of result.characters) {
        const charContent = database['sheet_characters']?.content || [[]];
        const existingRowIdx = charContent.findIndex((row, i) => i > 0 && (row[1] as string) === char.name);
        
        if (existingRowIdx === -1) {
          addRow('sheet_characters', {
            "1": char.name, "2": char.alias || '初登场',
            "3": char.gender || '', "4": char.appearance || '',
            "5": char.relationship || '', "6": char.description || '',
            "7": char.significance || '', "8": char.status !== '活跃' ? `【${char.status}】` : ''
          });
        } else {
          // Existing character - check for status/relationship changes
          const existingRow = charContent[existingRowIdx];
          const oldStatus = (existingRow[8] as string) || '';
          const oldRelationship = (existingRow[5] as string) || '';
          const hasChange = (char.status && char.status !== '活跃' && !oldStatus.includes(char.status)) ||
                           (char.relationship && char.relationship !== oldRelationship);
          if (hasChange) {
            const changeNote = oldStatus 
              ? `${oldStatus} → ${char.status}(${char.relationship})` 
              : `→ ${char.status}(${char.relationship})`;
            updateRow('sheet_characters', existingRowIdx, 8, changeNote);
          }
        }
      }
    }
  };

  // === Main import handler ===
  const handleStartImport = async () => {
    if (chunks.length === 0) { toast.error('请先加载文件'); return; }

    setIsProcessing(true);
    setIsPaused(false);
    setErrors([]);

    // Sample data path
    if (isSampleData && taskType === 'extraction') {
      if (selectedTables.length === 0) { toast.error('请选择至少一个表格'); setIsProcessing(false); return; }
      toast.info('🎭 正在注入示例角色数据...');
      await injectSampleData();
      for (let i = 0; i < chunks.length; i++) {
        setStatus({ total: chunks.length, currentIndex: i + 1 });
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      setIsProcessing(false);
      setStatus({ total: chunks.length, currentIndex: chunks.length });
      toast.success('✅ 示例数据注入完成！点击左侧"数据库"查看结果');
      setTimeout(() => setCurrentSheet('sheet_protagonist'), 500);
      return;
    }

    // Check API config for non-sample tasks
    const { apiConfig, apiMode } = settings;
    if (apiMode === 'direct' || apiMode === 'proxy') {
      if (!apiConfig.url || !apiConfig.apiKey) {
        toast.error('请先在 API 设置中配置 API 地址和密钥');
        setIsProcessing(false);
        return;
      }
    }

    const extractionErrors: Array<{ index: number; error: string }> = [];

    if (taskType === 'extraction') {
      if (selectedTables.length === 0) { toast.error('请选择至少一个表格'); setIsProcessing(false); return; }
      toast.info(`开始 AI 角色提取 (并发数: ${settings.extractionConcurrency})...`);

      const queue = new ConcurrentQueue<ExtractionResult | null>(
        settings.extractionConcurrency,
        (index, result) => { if (result) writeExtractionResult(result); },
        (completed, total) => { setStatus({ total, currentIndex: completed }); },
        (index, error) => {
          extractionErrors.push({ index, error: error.message });
          setErrors([...extractionErrors]);
          toast.error(`分块 ${index + 1} 提取失败: ${error.message}`);
        }
      );
      queueRef.current = queue;

      const tasks = chunks.map((chunk, chunkIndex) => {
        return async (signal: AbortSignal) => {
          const protagonistContent = database['sheet_protagonist']?.content || [[]];
          const charactersContent = database['sheet_characters']?.content || [[]];
          const known = extractKnownCharacters(protagonistContent, charactersContent);
          const suffix = buildKnownCharactersSuffix(known);
          const responseText = await callExtractionAPI(chunk.content, settings.extractionPrompt, suffix, chunkIndex, signal);
          const parsed = parseExtractionResponse(responseText);
          if (!parsed) throw new Error('AI 返回的不是合法 JSON');
          return parsed;
        };
      });

      await queue.run(tasks);
      queueRef.current = null;
      setIsProcessing(false);
      if (extractionErrors.length > 0) {
        toast.warning(`提取完成，${extractionErrors.length} 个分块出现错误`);
      } else {
        toast.success('✅ AI 角色提取完成！点击左侧"数据库"查看结果');
      }
      setTimeout(() => setCurrentSheet('sheet_protagonist'), 500);

    } else if (taskType === 'summary') {
      toast.info(`开始分卷总结 (并发数: ${settings.extractionConcurrency})...`);
      const results: string[] = [];

      const queue = new ConcurrentQueue<string>(
        settings.extractionConcurrency,
        (index, result) => {
          results[index] = result;
          setSummaryResults([...results.filter(Boolean)]);
        },
        (completed, total) => { setStatus({ total, currentIndex: completed }); },
        (index, error) => {
          extractionErrors.push({ index, error: error.message });
          setErrors([...extractionErrors]);
          results[index] = `### 第${index + 1}卷 - 生成失败\n\n错误: ${error.message}`;
          setSummaryResults([...results.filter(Boolean)]);
        }
      );
      queueRef.current = queue;

      const tasks = chunks.map((chunk, i) => {
        return async (signal: AbortSignal) => {
          return callSummaryAPI(chunk.content, settings, i + 1, signal);
        };
      });

      await queue.run(tasks);
      queueRef.current = null;
      setIsProcessing(false);
      toast.success('✅ 分卷总结完成！');

    } else if (taskType === 'diary') {
      toast.info(`开始生成角色日记 (并发数: ${settings.extractionConcurrency})...`);
      const results: string[] = [];

      const queue = new ConcurrentQueue<string>(
        settings.extractionConcurrency,
        (index, result) => {
          results[index] = result;
          setDiaryResults([...results.filter(Boolean)]);
        },
        (completed, total) => { setStatus({ total, currentIndex: completed }); },
        (index, error) => {
          extractionErrors.push({ index, error: error.message });
          setErrors([...extractionErrors]);
        }
      );
      queueRef.current = queue;

      const tasks = chunks.map((chunk) => {
        return async (signal: AbortSignal) => {
          return callDiaryAPI(chunk.content, settings, signal);
        };
      });

      await queue.run(tasks);
      queueRef.current = null;
      setIsProcessing(false);
      toast.success('✅ 角色日记生成完成！');
    }
  };

  const handlePauseResume = () => {
    if (!queueRef.current) return;
    if (isPaused) { queueRef.current.resume(); setIsPaused(false); toast.info('已继续处理'); }
    else { queueRef.current.pause(); setIsPaused(true); toast.info('已暂停处理'); }
  };

  const handleCancel = () => {
    if (queueRef.current) queueRef.current.abort();
    setIsProcessing(false);
    setIsPaused(false);
    toast.info('已取消处理');
  };

  const handleClear = () => {
    if (queueRef.current) queueRef.current.abort();
    setChunks([]); setStatus(null); setIsProcessing(false); setIsPaused(false);
    setPreviewContent(''); setIsSampleData(false); setErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('已清除导入数据');
  };

  const toggleTableSelection = (key: string) => {
    setSelectedTables(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const taskTypeConfig: Record<TaskType, { label: string; icon: typeof Bot; description: string; buttonText: string }> = {
    extraction: { label: 'AI 角色提取', icon: Bot, description: '从文本中提取角色信息写入数据库', buttonText: '开始 AI 提取' },
    summary: { label: '分卷总结', icon: Merge, description: '对每个分块生成结构化总结', buttonText: '开始总结' },
    diary: { label: '角色日记', icon: BookHeart, description: '以角色视角生成日记', buttonText: '开始生成日记' },
  };

  const fileAccept = inputSourceType === 'chat' ? '.jsonl,.txt,.json' : '.txt,.md,.json';

  return (
    <div
      className="flex-1 p-6 overflow-auto relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Upload className="w-12 h-12 text-primary mx-auto mb-3" />
            <p className="text-lg font-medium text-primary">拖放文件到此处导入</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">① 导入文本</h1>
          <p className="text-muted-foreground">导入文本或聊天记录，选择 AI 处理任务</p>
        </div>

        <div className="grid gap-6">
          {/* Quick Start */}
          <Alert className="border-primary/30 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>快速体验：</strong>点击「加载示例」→ 点击「开始注入」→ 无需API即可查看角色追踪效果。
            </AlertDescription>
          </Alert>

          {/* Input Source Tabs */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-primary" />
                输入源
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={inputSourceType}
                onValueChange={(v) => setSettings({ inputSourceType: v as any })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="novel" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    小说文本
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    聊天记录
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="novel" className="mt-4">
                  <p className="text-sm text-muted-foreground">支持 .txt / .md / .json 文本文件，按字符数拆分</p>
                </TabsContent>
                <TabsContent value="chat" className="mt-4">
                  <p className="text-sm text-muted-foreground">支持 .jsonl 聊天记录，按消息条数分段（自动提取角色名）</p>
                  {settings.chatMeta && (
                    <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                      角色: {settings.chatMeta.charName} | 用户: {settings.chatMeta.userName} | {settings.chatMeta.messageCount} 条消息
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* File Upload Card */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-primary" />
                文件加载
              </CardTitle>
              <CardDescription>选择文件、拖拽上传、粘贴文本，或加载示例</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{inputSourceType === 'chat' ? '分段消息数' : '分割字符数'}</Label>
                  <Input
                    type="number"
                    value={inputSourceType === 'chat' ? settings.chatSegmentSize : settings.importSplitSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || (inputSourceType === 'chat' ? 50 : 10000);
                      if (inputSourceType === 'chat') setSettings({ chatSegmentSize: val });
                      else setSettings({ importSplitSize: val });
                    }}
                    min={inputSourceType === 'chat' ? 20 : 1000}
                    max={inputSourceType === 'chat' ? 200 : 100000}
                  />
                </div>
                <div className="space-y-2">
                  <Label>AI 并发数</Label>
                  <Input
                    type="number"
                    value={settings.extractionConcurrency}
                    onChange={(e) => setSettings({ extractionConcurrency: Math.max(1, Math.min(10, parseInt(e.target.value) || 3)) })}
                    min={1} max={10}
                  />
                  <p className="text-xs text-muted-foreground">同时发送的 API 请求数</p>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <input ref={fileInputRef} type="file" accept={fileAccept} onChange={handleFileSelect} className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1 min-w-[120px]">
                  <Upload className="w-4 h-4 mr-2" />选择文件
                </Button>
                {inputSourceType === 'novel' && (
                  <Button onClick={() => setPasteMode(true)} variant="outline" className="flex-1 min-w-[120px]">
                    <ClipboardPaste className="w-4 h-4 mr-2" />粘贴文本
                  </Button>
                )}
                {inputSourceType === 'novel' && (
                  <Button onClick={handleLoadSample} variant="default" className="flex-1 min-w-[120px] glow-primary">
                    <BookOpen className="w-4 h-4 mr-2" />加载示例
                  </Button>
                )}
                <Button onClick={handleClear} variant="outline" disabled={chunks.length === 0}>
                  <Trash2 className="w-4 h-4 mr-2" />清除
                </Button>
              </div>

              {/* Paste dialog */}
              {pasteMode && (
                <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <Label>粘贴小说文本</Label>
                    <Button variant="ghost" size="icon" onClick={() => setPasteMode(false)}><X className="w-4 h-4" /></Button>
                  </div>
                  <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)}
                    placeholder="在此粘贴小说文本内容..." className="min-h-[200px] font-mono text-sm" />
                  <Button onClick={handlePasteImport} className="w-full">
                    <Zap className="w-4 h-4 mr-2" />确认导入 ({pasteText.length.toLocaleString()} 字)
                  </Button>
                </div>
              )}

              {/* Loaded info + chunk preview */}
              {chunks.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium">{isSampleData ? '📚 示例小说已加载' : '文件已加载'}</span>
                    <Badge variant={isSampleData ? "default" : "secondary"} className="ml-auto">
                      {chunks.reduce((acc, c) => acc + c.content.length, 0).toLocaleString()} 字
                    </Badge>
                    {isSampleData && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">无需API</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    已拆分为 <span className="text-primary font-medium">{chunks.length}</span> 个分块
                    {isSampleData && <span className="text-success ml-2">• 包含5个主角阶段 + 7个重要人物</span>}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {chunks.map((chunk, i) => (
                      <Badge key={i} variant="outline"
                        className={cn("cursor-pointer hover:bg-primary/10 transition-colors",
                          errors.find(e => e.index === i) && "border-destructive text-destructive"
                        )}
                        onClick={() => setViewingChunk(i)}>
                        <Eye className="w-3 h-3 mr-1" />分块 {i + 1}
                        <span className="ml-1 text-muted-foreground">({chunk.content.length}字)</span>
                      </Badge>
                    ))}
                  </div>

                  {previewContent && (
                    <div className="p-3 rounded bg-background/50 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">内容预览：</p>
                      <p className="text-sm font-mono whitespace-pre-wrap line-clamp-4">{previewContent}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Type Selection */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                任务类型
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(taskTypeConfig) as [TaskType, typeof taskTypeConfig[TaskType]][]).map(([key, config]) => {
                  const Icon = config.icon;
                  const isActive = taskType === key;
                  return (
                    <motion.div
                      key={key}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all text-center",
                        isActive ? "border-primary bg-primary/10" : "border-border/50 hover:border-border"
                      )}
                      onClick={() => setSettings({ taskType: key })}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className={cn("w-6 h-6 mx-auto mb-2", isActive && "text-primary")} />
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Table Selection - only for extraction */}
          {taskType === 'extraction' && (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />注入表选择
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedTables(sortedSheets.map(s => s.key))}>全选</Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTables([])}>全不选</Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {sortedSheets.map((sheet) => {
                    const isRecommended = isSampleData && (sheet.key === 'sheet_protagonist' || sheet.key === 'sheet_characters');
                    return (
                      <motion.div key={sheet.key}
                        className={cn("p-3 rounded-lg border cursor-pointer transition-all",
                          selectedTables.includes(sheet.key) ? "border-primary bg-primary/10" : "border-border/50 hover:border-border"
                        )}
                        onClick={() => toggleTableSelection(sheet.key)}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{sheet.name}</span>
                          <div className="flex items-center gap-1">
                            {isRecommended && <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">推荐</Badge>}
                            {selectedTables.includes(sheet.key) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress & Controls */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />处理控制
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>处理进度</span>
                    <span className="text-muted-foreground">{status.currentIndex} / {status.total}</span>
                  </div>
                  <Progress value={(status.currentIndex / status.total) * 100} className="h-2" />
                  <div className="flex items-center gap-2 text-sm">
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-primary">{isPaused ? '已暂停' : isSampleData ? '正在注入示例数据...' : `正在${taskTypeConfig[taskType].label}...`}</span>
                      </>
                    ) : status.currentIndex === status.total ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-success">处理完成</span>
                      </>
                    ) : status.currentIndex > 0 ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-warning" />
                        <span className="text-warning">已暂停</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">等待开始</span>
                    )}
                  </div>
                </div>
              )}

              {errors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm font-medium text-destructive mb-1">错误记录 ({errors.length})</p>
                  <div className="text-xs text-destructive/80 space-y-1 max-h-24 overflow-auto">
                    {errors.map((err, i) => (
                      <p key={i}>分块 {err.index + 1}: {err.error}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {isProcessing && !isSampleData && (
                  <>
                    <Button onClick={handlePauseResume} variant="outline" className="flex-1">
                      {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                      {isPaused ? '继续' : '暂停'}
                    </Button>
                    <Button onClick={handleCancel} variant="destructive" size="icon">
                      <StopCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleStartImport}
                  disabled={chunks.length === 0 || isProcessing || (taskType === 'extraction' && selectedTables.length === 0)}
                  className="flex-1 glow-primary" size="lg">
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />处理中...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" />{isSampleData && taskType === 'extraction' ? '开始注入（演示模式）' : taskTypeConfig[taskType].buttonText}</>
                  )}
                </Button>
                <Button variant="outline"
                  onClick={() => setStatus({ total: status?.total || 0, currentIndex: 0 })}
                  disabled={!status || isProcessing}>
                  <RotateCcw className="w-4 h-4 mr-2" />重置
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chunk viewer dialog */}
      <Dialog open={viewingChunk !== null} onOpenChange={() => setViewingChunk(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>分块 {viewingChunk !== null ? viewingChunk + 1 : ''} 内容</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <pre className="whitespace-pre-wrap text-sm font-mono p-4">
              {viewingChunk !== null ? chunks[viewingChunk]?.content : ''}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
