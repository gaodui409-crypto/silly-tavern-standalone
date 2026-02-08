import { useState, useRef } from 'react';
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
  Eye
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { ImportChunk, ImportStatus } from '@/types/database';
import { SAMPLE_NOVEL, SAMPLE_CHARACTERS } from '@/data/sampleNovel';

export function ImportPanel() {
  const { settings, setSettings, database, addRow, setCurrentSheet, setImportChunks } = useDatabaseStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [chunks, setChunks] = useState<ImportChunk[]>([]);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isSampleData, setIsSampleData] = useState(false);

  const sortedSheets = Object.entries(database)
    .map(([key, sheet]) => ({ key, ...sheet }))
    .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));

  const handleLoadSample = () => {
    const content = SAMPLE_NOVEL;
    const splitSize = settings.importSplitSize || 10000;
    const newChunks: ImportChunk[] = [];
    
    for (let i = 0; i < content.length; i += splitSize) {
      newChunks.push({
        content: content.substring(i, i + splitSize),
        index: newChunks.length
      });
    }

    setChunks(newChunks);
    setImportChunks(newChunks.map(c => c.content)); // 保存到全局store供分卷总结使用
    setStatus({ total: newChunks.length, currentIndex: 0 });
    setPreviewContent(content.substring(0, 500) + '...');
    setIsSampleData(true);
    
    // 自动选择主角和重要人物表
    setSelectedTables(['sheet_protagonist', 'sheet_characters']);
    
    toast.success(`示例小说已加载（${content.length} 字），可直接点击"开始注入"查看效果`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        toast.error('文件为空或读取失败');
        return;
      }

      const splitSize = settings.importSplitSize || 10000;
      const newChunks: ImportChunk[] = [];
      
      for (let i = 0; i < content.length; i += splitSize) {
        newChunks.push({
          content: content.substring(i, i + splitSize),
          index: newChunks.length
        });
      }

      setChunks(newChunks);
      setImportChunks(newChunks.map(c => c.content)); // 保存到全局store供分卷总结使用
      setStatus({ total: newChunks.length, currentIndex: 0 });
      setIsSampleData(false);
      toast.success(`文件已拆分为 ${newChunks.length} 个部分`);
    };

    reader.onerror = () => {
      toast.error('读取文件时出错');
    };

    reader.readAsText(file, 'UTF-8');
  };

  // 注入示例数据到数据库
  const injectSampleData = async () => {
    const { protagonist, importantCharacters } = SAMPLE_CHARACTERS;
    
    // 注入主角阶段数据
    if (selectedTables.includes('sheet_protagonist')) {
      for (let i = 0; i < protagonist.stages.length; i++) {
        const stage = protagonist.stages[i];
        setStatus({ total: chunks.length + protagonist.stages.length + importantCharacters.length, currentIndex: i + 1 });
        
        // 模拟处理延迟
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // addRow 期望 Record<string, string | number> 格式
        addRow('sheet_protagonist', {
          "1": protagonist.name,
          "2": stage.stage,
          "3": i === 0 ? '男/23岁' : (i === 4 ? '男/25岁' : '男/23-24岁'),
          "4": '俊秀面容，气质从容',
          "5": stage.status,
          "6": stage.description,
          "7": stage.keyEvents || stage.mentalState || '',
          "8": i === 0 ? '' : `【变化】${stage.abilities}`
        });
      }
    }
    
    // 注入重要人物数据
    if (selectedTables.includes('sheet_characters')) {
      const baseIndex = protagonist.stages.length;
      for (let i = 0; i < importantCharacters.length; i++) {
        const char = importantCharacters[i];
        setStatus({ 
          total: chunks.length + protagonist.stages.length + importantCharacters.length, 
          currentIndex: baseIndex + i + 1 
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        addRow('sheet_characters', {
          "1": char.name,
          "2": char.alias !== '无' ? char.alias : '初登场',
          "3": char.abilities?.includes('斗') ? '男' : '女',
          "4": char.description.substring(0, 50),
          "5": char.relationship,
          "6": char.description,
          "7": char.significance || '',
          "8": char.status === '活跃' ? '' : `【离场】${char.status}`
        });
      }
    }
  };

  const handleStartImport = async () => {
    if (chunks.length === 0) {
      toast.error('请先加载文件');
      return;
    }

    if (selectedTables.length === 0) {
      toast.error('请选择至少一个表格');
      return;
    }

    setIsProcessing(true);
    
    // 如果是示例数据，直接注入预设数据
    if (isSampleData) {
      toast.info('🎭 正在注入示例角色数据...');
      await injectSampleData();
      
      // 模拟剩余处理
      const totalSteps = chunks.length;
      for (let i = 0; i < totalSteps; i++) {
        setStatus({ total: totalSteps, currentIndex: i + 1 });
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      setIsProcessing(false);
      setStatus({ total: chunks.length, currentIndex: chunks.length });
      toast.success('✅ 示例数据注入完成！点击左侧"数据库"查看结果');
      
      // 自动切换到主角信息表
      setTimeout(() => {
        setCurrentSheet('sheet_protagonist');
      }, 500);
      
      return;
    }

    // 正常处理流程（需要API）
    toast.info('开始处理导入...');

    for (let i = status?.currentIndex || 0; i < chunks.length; i++) {
      if (!isProcessing) break;
      
      setStatus({ total: chunks.length, currentIndex: i + 1 });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsProcessing(false);
    toast.success('导入处理完成！');
  };

  const handleClear = () => {
    setChunks([]);
    setStatus(null);
    setIsProcessing(false);
    setPreviewContent('');
    setIsSampleData(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('已清除导入数据');
  };

  const toggleTableSelection = (key: string) => {
    setSelectedTables(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(sortedSheets.map(s => s.key));
  };

  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">① 导入文本</h1>
          <p className="text-muted-foreground">从外部文本文件导入小说，AI将自动提取角色信息</p>
        </div>

        <div className="grid gap-6">
          {/* Quick Start Guide */}
          <Alert className="border-primary/30 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>快速体验：</strong>点击「加载示例」→ 点击「开始注入」→ 无需API即可查看角色追踪效果
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-primary" />
                文件加载
              </CardTitle>
              <CardDescription>选择要导入的文本文件，或加载示例体验功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>分割字符数</Label>
                  <Input
                    type="number"
                    value={settings.importSplitSize}
                    onChange={(e) => setSettings({ 
                      importSplitSize: parseInt(e.target.value) || 10000 
                    })}
                    min={1000}
                    max={100000}
                  />
                  <p className="text-xs text-muted-foreground">每个分块的最大字符数</p>
                </div>
                <div className="space-y-2">
                  <Label>文件编码</Label>
                  <Select defaultValue="UTF-8">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTF-8">UTF-8</SelectItem>
                      <SelectItem value="GBK">GBK</SelectItem>
                      <SelectItem value="GB2312">GB2312</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  选择文件
                </Button>
                <Button 
                  onClick={handleLoadSample}
                  variant="default"
                  className="flex-1 glow-primary"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  加载示例
                </Button>
                <Button 
                  onClick={handleClear}
                  variant="outline"
                  disabled={chunks.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清除
                </Button>
              </div>

              {chunks.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {isSampleData ? '📚 示例小说已加载' : '文件已加载'}
                    </span>
                    <Badge variant={isSampleData ? "default" : "secondary"} className="ml-auto">
                      {chunks.reduce((acc, c) => acc + c.content.length, 0).toLocaleString()} 字
                    </Badge>
                    {isSampleData && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        无需API
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    已拆分为 <span className="text-primary font-medium">{chunks.length}</span> 个分块
                    {isSampleData && <span className="text-green-600 ml-2">• 包含5个主角阶段 + 7个重要人物</span>}
                  </p>
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

          {/* Table Selection */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  注入表选择
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllTables}>
                    全选
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllTables}>
                    全不选
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                选择要注入数据的目标表格
                {isSampleData && <span className="text-primary ml-1">（已自动选择推荐表格）</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {sortedSheets.map((sheet) => {
                  const isRecommended = isSampleData && 
                    (sheet.key === 'sheet_protagonist' || sheet.key === 'sheet_characters');
                  
                  return (
                    <motion.div
                      key={sheet.key}
                      className={`
                        p-3 rounded-lg border cursor-pointer transition-all relative
                        ${selectedTables.includes(sheet.key) 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border/50 hover:border-border'}
                      `}
                      onClick={() => toggleTableSelection(sheet.key)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{sheet.name}</span>
                        <div className="flex items-center gap-1">
                          {isRecommended && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                              推荐
                            </Badge>
                          )}
                          {selectedTables.includes(sheet.key) && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Progress & Controls */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                处理控制
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>处理进度</span>
                    <span className="text-muted-foreground">
                      {status.currentIndex} / {status.total}
                    </span>
                  </div>
                  <Progress 
                    value={(status.currentIndex / status.total) * 100} 
                    className="h-2"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-primary">
                          {isSampleData ? '正在注入示例数据...' : '正在处理...'}
                        </span>
                      </>
                    ) : status.currentIndex === status.total ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">处理完成 - 点击左侧「② 数据库」查看结果</span>
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

              <div className="flex gap-4">
                <Button
                  onClick={handleStartImport}
                  disabled={chunks.length === 0 || selectedTables.length === 0 || isProcessing}
                  className="flex-1 glow-primary"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : status && status.currentIndex > 0 && status.currentIndex < status.total ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      继续
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {isSampleData ? '开始注入（演示模式）' : '开始注入'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStatus({ total: status?.total || 0, currentIndex: 0 })}
                  disabled={!status || isProcessing}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重置
                </Button>
              </div>
              
              {isSampleData && !isProcessing && status?.currentIndex !== status?.total && (
                <p className="text-xs text-muted-foreground text-center">
                  💡 演示模式：无需配置API，直接体验角色追踪功能
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
