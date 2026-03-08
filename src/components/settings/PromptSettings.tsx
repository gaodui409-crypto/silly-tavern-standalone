import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw,
  GripVertical,
  Settings2,
  User,
  Bot,
  Wand2,
  BookHeart
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { PromptSegment } from '@/types/database';
import { cn } from '@/lib/utils';
import { DEFAULT_EXTRACTION_PROMPT } from '@/lib/aiExtractor';
import { DEFAULT_DIARY_PROMPT, DIARY_STYLE_PRESETS } from '@/lib/diaryApi';

const DEFAULT_PROMPT = `你是一个数据库管理AI，负责分析对话内容并更新相应的数据表。

## 任务说明
根据提供的对话内容，分析并更新以下数据库表格。

## 占位符说明
- $1 - 世界书内容
- $5 - 总体大纲表内容
- $6 - 上一轮剧情规划数据
- $7 - 实际读取的前文上下文

## 输出格式
使用 <tableEdit> 标签包裹你的编辑指令：
<tableEdit>
<!-- insertRow(tableIndex, {"columnIndex": "value"}) -->
<!-- updateRow(tableIndex, rowIndex, {"columnIndex": "newValue"}) -->
<!-- deleteRow(tableIndex, rowIndex) -->
</tableEdit>`;

export function PromptSettings() {
  const { settings, setSettings } = useDatabaseStore();
  const [segments, setSegments] = useState<PromptSegment[]>(
    Array.isArray(settings.charCardPrompt) 
      ? settings.charCardPrompt 
      : [{ role: 'system', content: DEFAULT_PROMPT, mainSlot: 'A', deletable: false }]
  );
  const [extractionPrompt, setExtractionPrompt] = useState(
    settings.extractionPrompt || DEFAULT_EXTRACTION_PROMPT
  );
  const [diaryPrompt, setDiaryPrompt] = useState(
    settings.diaryPrompt || DEFAULT_DIARY_PROMPT
  );
  const [diaryStyle, setDiaryStyle] = useState(settings.diaryStyle || 'daily');
  const [diaryNsfw, setDiaryNsfw] = useState(settings.diaryNsfw ?? true);

  const handleUpdateSegment = (index: number, updates: Partial<PromptSegment>) => {
    const newSegments = [...segments];
    newSegments[index] = { ...newSegments[index], ...updates };
    setSegments(newSegments);
  };

  const handleDeleteSegment = (index: number) => {
    if (segments[index].mainSlot === 'A' || segments[index].mainSlot === 'B') {
      toast.error('主提示词段落不可删除');
      return;
    }
    setSegments(segments.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setSettings({ charCardPrompt: segments, extractionPrompt, diaryPrompt, diaryStyle, diaryNsfw });
    toast.success('提示词设置已保存');
  };

  const handleReset = () => {
    if (confirm('确定重置为默认提示词？')) {
      const defaultSegments: PromptSegment[] = [
        { role: 'system', content: DEFAULT_PROMPT, mainSlot: 'A', deletable: false }
      ];
      setSegments(defaultSegments);
      setExtractionPrompt(DEFAULT_EXTRACTION_PROMPT);
      setDiaryPrompt(DEFAULT_DIARY_PROMPT);
      setDiaryStyle('daily');
      setDiaryNsfw(true);
      setSettings({ charCardPrompt: defaultSegments, extractionPrompt: DEFAULT_EXTRACTION_PROMPT, diaryPrompt: DEFAULT_DIARY_PROMPT, diaryStyle: 'daily', diaryNsfw: true });
      toast.info('已重置为默认提示词');
    }
  };

  const handleDiaryStyleChange = (style: string) => {
    setDiaryStyle(style);
    const preset = DIARY_STYLE_PRESETS[style];
    if (preset && preset.template) {
      setDiaryPrompt(preset.template);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">提示词设置</h1>
          <p className="text-muted-foreground">配置AI填表、角色提取和日记生成的提示词模板</p>
        </div>

        <Tabs defaultValue="filling" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="filling">填表提示词</TabsTrigger>
            <TabsTrigger value="extraction">角色提取提示词</TabsTrigger>
            <TabsTrigger value="diary">角色日记</TabsTrigger>
          </TabsList>

          <TabsContent value="filling" className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">占位符说明</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li><code className="tag-primary px-1.5 py-0.5 rounded text-xs">$1</code> - 世界书内容</li>
                      <li><code className="tag-primary px-1.5 py-0.5 rounded text-xs">$5</code> - 总体大纲表内容</li>
                      <li><code className="tag-primary px-1.5 py-0.5 rounded text-xs">$6</code> - 上一轮剧情规划数据</li>
                      <li><code className="tag-primary px-1.5 py-0.5 rounded text-xs">$7</code> - 前文上下文</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {segments.map((segment, index) => (
                <motion.div key={index}
                  initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }} transition={{ delay: index * 0.05 }}>
                  <Card className={cn("card-hover",
                    segment.mainSlot === 'A' && "border-l-4 border-l-primary",
                    segment.mainSlot === 'B' && "border-l-4 border-l-warning")}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          <Select value={segment.role}
                            onValueChange={(value: 'system' | 'user' | 'assistant') => handleUpdateSegment(index, { role: value })}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="system"><div className="flex items-center gap-2"><Settings2 className="w-4 h-4" />系统</div></SelectItem>
                              <SelectItem value="user"><div className="flex items-center gap-2"><User className="w-4 h-4" />用户</div></SelectItem>
                              <SelectItem value="assistant"><div className="flex items-center gap-2"><Bot className="w-4 h-4" />AI</div></SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={segment.mainSlot || 'none'}
                            onValueChange={(value) => handleUpdateSegment(index, { mainSlot: value === 'none' ? '' : value as 'A' | 'B', deletable: value === 'none' })}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="普通段落" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">普通段落</SelectItem>
                              <SelectItem value="A">主提示词 A (System)</SelectItem>
                              <SelectItem value="B">主提示词 B (User)</SelectItem>
                            </SelectContent>
                          </Select>
                          {segment.mainSlot && (
                            <Badge variant="outline" className={cn(
                              segment.mainSlot === 'A' ? 'border-primary text-primary' : 'border-warning text-warning'
                            )}>不可删除</Badge>
                          )}
                        </div>
                        {segment.deletable !== false && !segment.mainSlot && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSegment(index)}
                            className="hover:bg-destructive/20 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea value={segment.content}
                        onChange={(e) => handleUpdateSegment(index, { content: e.target.value })}
                        placeholder="输入提示词内容..."
                        className="min-h-[200px] font-mono text-sm resize-y" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            <motion.div
              className="flex items-center justify-center p-4 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => setSegments([...segments, { role: 'user', content: '', mainSlot: '', deletable: true }])}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Plus className="w-5 h-5 mr-2 text-primary" />
              <span className="text-sm font-medium text-primary">添加提示词段落</span>
            </motion.div>
          </TabsContent>

          <TabsContent value="extraction" className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Wand2 className="w-5 h-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">角色提取提示词</p>
                    <p className="text-muted-foreground">
                      用于导入文本时 AI 自动提取角色信息。<code className="tag-primary px-1.5 py-0.5 rounded text-xs">$CONTENT</code> 为分块文本占位符。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-primary" />角色提取模板</CardTitle>
                <CardDescription>AI 将按此模板分析每个文本分块并返回 JSON 格式的角色数据</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={extractionPrompt}
                  onChange={(e) => setExtractionPrompt(e.target.value)}
                  className="min-h-[400px] font-mono text-sm resize-y" placeholder="输入角色提取提示词模板..." />
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm"
                    onClick={() => { setExtractionPrompt(DEFAULT_EXTRACTION_PROMPT); toast.info('已恢复默认角色提取模板'); }}>
                    <RotateCcw className="w-4 h-4 mr-2" />恢复默认
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diary" className="space-y-4">
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <BookHeart className="w-5 h-5 text-warning mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning mb-1">角色日记提示词</p>
                    <p className="text-muted-foreground">
                      用于将聊天记录转化为角色第一人称日记。占位符：
                      <code className="tag-warning px-1.5 py-0.5 rounded text-xs mx-1">$CONTENT</code>对话内容，
                      <code className="tag-warning px-1.5 py-0.5 rounded text-xs mx-1">{'{{char}}'}</code>角色名，
                      <code className="tag-warning px-1.5 py-0.5 rounded text-xs mx-1">{'{{user}}'}</code>用户名
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookHeart className="w-5 h-5 text-warning" />日记模板</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>风格预设</Label>
                    <Select value={diaryStyle} onValueChange={handleDiaryStyleChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DIARY_STYLE_PRESETS).map(([key, preset]) => (
                          <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>NSFW</Label>
                    <Switch checked={diaryNsfw} onCheckedChange={setDiaryNsfw} />
                  </div>
                </div>

                <Textarea value={diaryPrompt}
                  onChange={(e) => { setDiaryPrompt(e.target.value); setDiaryStyle('custom'); }}
                  className="min-h-[300px] font-mono text-sm resize-y"
                  placeholder="输入日记生成模板..." />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    onClick={() => { setDiaryPrompt(DEFAULT_DIARY_PROMPT); setDiaryStyle('daily'); toast.info('已恢复默认日记模板'); }}>
                    <RotateCcw className="w-4 h-4 mr-2" />恢复默认
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />重置默认
          </Button>
          <Button onClick={handleSave} className="glow-primary">
            <Save className="w-4 h-4 mr-2" />保存设置
          </Button>
        </div>
      </div>
    </div>
  );
}
