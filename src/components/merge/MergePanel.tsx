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

const DEFAULT_MERGE_PROMPT = `请将以下总结内容合并为 $TARGET_COUNT 条精简的总结：

## 总结表数据
$A

## 大纲表数据
$B

## 当前基础数据
$BASE_DATA

请使用 <tableEdit> 格式输出合并后的结果。每个新条目应该：
1. 保留关键信息
2. 合并相似时间段的事件
3. 保持叙事连贯性`;

export function MergePanel() {
  const { settings, setSettings, database } = useDatabaseStore();
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  
  const mergeSettings = settings.mergeSettings;

  // 获取总结表和大纲表的数据统计
  const summarySheet = Object.values(database).find(s => s.name === '总结表');
  const outlineSheet = Object.values(database).find(s => s.name === '总体大纲');
  const summaryRowCount = summarySheet ? summarySheet.content.length - 1 : 0;
  const outlineRowCount = outlineSheet ? outlineSheet.content.length - 1 : 0;

  const updateMergeSettings = (updates: Partial<typeof mergeSettings>) => {
    setSettings({
      mergeSettings: { ...mergeSettings, ...updates }
    });
  };

  const handleStartMerge = async () => {
    if (summaryRowCount === 0 && outlineRowCount === 0) {
      toast.error('没有可合并的数据');
      return;
    }

    if (!confirm(`即将开始合并总结。\n\n源数据: ${summaryRowCount} 条总结 + ${outlineRowCount} 条大纲\n目标: 精简为 ${mergeSettings.targetCount} 条\n\n此操作将使用AI重写数据，不可逆！建议先导出JSON备份。`)) {
      return;
    }

    setIsMerging(true);
    setMergeProgress(0);
    toast.info('开始合并总结...');

    // 模拟合并过程
    const totalBatches = Math.ceil(Math.max(summaryRowCount, outlineRowCount) / mergeSettings.batchSize);
    for (let i = 0; i < totalBatches; i++) {
      setMergeProgress(((i + 1) / totalBatches) * 100);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsMerging(false);
    toast.success('合并完成！');
  };

  const handleSave = () => {
    toast.success('合并设置已保存');
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">合并总结</h1>
          <p className="text-muted-foreground">使用AI将多条总结合并为精简版本</p>
        </div>

        <div className="space-y-6">
          {/* Data Stats */}
          <Card className="card-hover border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{summaryRowCount}</p>
                  <p className="text-sm text-muted-foreground">总结表条目</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">{outlineRowCount}</p>
                  <p className="text-sm text-muted-foreground">大纲表条目</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{summaryRowCount + outlineRowCount}</p>
                  <p className="text-sm text-muted-foreground">总计</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Merge Settings */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                合并参数
              </CardTitle>
              <CardDescription>配置合并行为</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>目标条数</Label>
                  <Input
                    type="number"
                    value={mergeSettings.targetCount}
                    onChange={(e) => updateMergeSettings({ 
                      targetCount: parseInt(e.target.value) || 1 
                    })}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">合并后保留的条目数</p>
                </div>
                <div className="space-y-2">
                  <Label>批处理大小</Label>
                  <Input
                    type="number"
                    value={mergeSettings.batchSize}
                    onChange={(e) => updateMergeSettings({ 
                      batchSize: parseInt(e.target.value) || 5 
                    })}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">每批处理的条目数</p>
                </div>
                <div className="space-y-2">
                  <Label>起始条数</Label>
                  <Input
                    type="number"
                    value={mergeSettings.startIndex}
                    onChange={(e) => updateMergeSettings({ 
                      startIndex: parseInt(e.target.value) || 1 
                    })}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">从第几条开始合并</p>
                </div>
                <div className="space-y-2">
                  <Label>终止条数</Label>
                  <Input
                    type="number"
                    value={mergeSettings.endIndex || ''}
                    onChange={(e) => updateMergeSettings({ 
                      endIndex: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="留空 = 到最后"
                  />
                  <p className="text-xs text-muted-foreground">合并到第几条结束</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>合并提示词模板</Label>
                <Textarea
                  value={mergeSettings.promptTemplate}
                  onChange={(e) => updateMergeSettings({ promptTemplate: e.target.value })}
                  placeholder={DEFAULT_MERGE_PROMPT}
                  className="min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  占位符: $TARGET_COUNT, $A (总结数据), $B (大纲数据), $BASE_DATA (基础数据)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Auto Merge Settings */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-primary" />
                自动合并设置
              </CardTitle>
              <CardDescription>配置自动触发合并的条件</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用自动合并</Label>
                  <p className="text-sm text-muted-foreground">
                    当条目超过阈值时自动触发合并
                  </p>
                </div>
                <Switch
                  checked={mergeSettings.autoEnabled}
                  onCheckedChange={(checked) => updateMergeSettings({ autoEnabled: checked })}
                />
              </div>

              <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: mergeSettings.autoEnabled ? 1 : 0.5 }}
                className="grid grid-cols-2 gap-4"
              >
                <div className="space-y-2">
                  <Label>触发阈值</Label>
                  <Input
                    type="number"
                    value={mergeSettings.autoThreshold}
                    onChange={(e) => updateMergeSettings({ 
                      autoThreshold: parseInt(e.target.value) || 20 
                    })}
                    min={5}
                    disabled={!mergeSettings.autoEnabled}
                  />
                  <p className="text-xs text-muted-foreground">超过此条数触发合并</p>
                </div>
                <div className="space-y-2">
                  <Label>保留条数</Label>
                  <Input
                    type="number"
                    value={mergeSettings.autoReserve}
                    onChange={(e) => updateMergeSettings({ 
                      autoReserve: parseInt(e.target.value) || 0 
                    })}
                    min={0}
                    disabled={!mergeSettings.autoEnabled}
                  />
                  <p className="text-xs text-muted-foreground">保留最新的N条不参与合并</p>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          {/* Manual Merge Control */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Merge className="w-5 h-5 text-primary" />
                手动合并
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isMerging && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>合并进度</span>
                    <span className="text-muted-foreground">{Math.round(mergeProgress)}%</span>
                  </div>
                  <Progress value={mergeProgress} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在合并...
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleStartMerge}
                  disabled={isMerging || (summaryRowCount === 0 && outlineRowCount === 0)}
                  className="flex-1 glow-primary"
                >
                  {isMerging ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      正在合并...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      开始合并
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMergeProgress(0)}
                  disabled={isMerging}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>
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
