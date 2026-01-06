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
  Loader2
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { ImportChunk, ImportStatus } from '@/types/database';

export function ImportPanel() {
  const { settings, setSettings, database } = useDatabaseStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [chunks, setChunks] = useState<ImportChunk[]>([]);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const sortedSheets = Object.entries(database)
    .map(([key, sheet]) => ({ key, ...sheet }))
    .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));

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
      setStatus({ total: newChunks.length, currentIndex: 0 });
      toast.success(`文件已拆分为 ${newChunks.length} 个部分`);
    };

    reader.onerror = () => {
      toast.error('读取文件时出错');
    };

    reader.readAsText(file, 'UTF-8');
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
    toast.info('开始处理导入...');

    // 模拟处理过程
    for (let i = status?.currentIndex || 0; i < chunks.length; i++) {
      if (!isProcessing) break;
      
      setStatus({ total: chunks.length, currentIndex: i + 1 });
      
      // 模拟处理延迟
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsProcessing(false);
    toast.success('导入处理完成！');
  };

  const handleClear = () => {
    setChunks([]);
    setStatus(null);
    setIsProcessing(false);
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
          <h1 className="text-3xl font-bold mb-2">外部导入</h1>
          <p className="text-muted-foreground">从外部文本文件导入数据到数据库</p>
        </div>

        <div className="grid gap-6">
          {/* File Upload */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-primary" />
                文件加载
              </CardTitle>
              <CardDescription>选择要导入的文本文件</CardDescription>
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

              <div className="flex gap-4">
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
                    <span className="font-medium">文件已加载</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    已拆分为 <span className="text-primary font-medium">{chunks.length}</span> 个分块
                  </p>
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
              <CardDescription>选择要注入数据的目标表格</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {sortedSheets.map((sheet) => (
                  <motion.div
                    key={sheet.key}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all
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
                      {selectedTables.includes(sheet.key) && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </motion.div>
                ))}
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
                        <span className="text-primary">正在处理...</span>
                      </>
                    ) : status.currentIndex === status.total ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">处理完成</span>
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
                >
                  {isProcessing ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      暂停
                    </>
                  ) : status && status.currentIndex > 0 && status.currentIndex < status.total ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      继续
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      开始注入
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
