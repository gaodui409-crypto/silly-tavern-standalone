import { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw,
  Settings2,
  Timer,
  Tag,
  MessageSquare,
  Save
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { PlotPromptItem } from '@/types/database';

export function PlotPanel() {
  const { settings, setSettings } = useDatabaseStore();
  const [isLooping, setIsLooping] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  
  const plotSettings = settings.plotSettings;
  const prompts = plotSettings.prompts || [];

  const getPromptById = (id: string): PlotPromptItem | undefined => {
    return prompts.find(p => p.id === id);
  };

  const updatePromptContent = (id: string, content: string) => {
    const newPrompts = prompts.map(p => 
      p.id === id ? { ...p, content } : p
    );
    setSettings({
      plotSettings: { ...plotSettings, prompts: newPrompts }
    });
  };

  const updatePlotSettings = (updates: Partial<typeof plotSettings>) => {
    setSettings({
      plotSettings: { ...plotSettings, ...updates }
    });
  };

  const handleStartLoop = () => {
    setIsLooping(true);
    toast.info('剧情循环已启动');
  };

  const handleStopLoop = () => {
    setIsLooping(false);
    toast.info('剧情循环已停止');
  };

  const handleSave = () => {
    toast.success('剧情设置已保存');
  };

  const mainPrompt = getPromptById('mainPrompt');
  const systemPrompt = getPromptById('systemPrompt');
  const finalDirective = getPromptById('finalSystemDirective');

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">剧情推进</h1>
          <p className="text-muted-foreground">配置自动剧情生成和循环设置</p>
        </div>

        <Tabs defaultValue="prompts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prompts">提示词设置</TabsTrigger>
            <TabsTrigger value="rates">推进速率</TabsTrigger>
            <TabsTrigger value="loop">自动循环</TabsTrigger>
          </TabsList>

          {/* Prompts Tab */}
          <TabsContent value="prompts" className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  提示词配置
                </CardTitle>
                <CardDescription>
                  配置剧情推进时使用的提示词
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>{mainPrompt?.name || '主系统提示词'}</Label>
                  <Textarea
                    value={mainPrompt?.content || ''}
                    onChange={(e) => updatePromptContent('mainPrompt', e.target.value)}
                    placeholder="输入主系统提示词，将替换数据库的主提示词部分"
                    className="min-h-[150px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">作为系统级别的核心指令</p>
                </div>

                <div className="space-y-2">
                  <Label>{systemPrompt?.name || '拦截任务详细指令'}</Label>
                  <Textarea
                    value={systemPrompt?.content || ''}
                    onChange={(e) => updatePromptContent('systemPrompt', e.target.value)}
                    placeholder="输入拦截任务详细指令"
                    className="min-h-[150px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">用于详细描述剧情规划任务</p>
                </div>

                <div className="space-y-2">
                  <Label>{finalDirective?.name || '最终注入指令'}</Label>
                  <Textarea
                    value={finalDirective?.content || ''}
                    onChange={(e) => updatePromptContent('finalSystemDirective', e.target.value)}
                    placeholder="输入最终注入指令"
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">注入给主AI的最终指令</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rates Tab */}
          <TabsContent value="rates" className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  推进速率设置
                </CardTitle>
                <CardDescription>
                  调整不同剧情线的推进速度 (占位符 sulv1-4)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  {/* Main Plot Rate */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>主线剧情推进速率 (sulv1)</Label>
                      <Badge variant="outline">{plotSettings.rateMain.toFixed(2)}</Badge>
                    </div>
                    <Slider
                      value={[plotSettings.rateMain * 100]}
                      onValueChange={([value]) => updatePlotSettings({ rateMain: value / 100 })}
                      min={0}
                      max={200}
                      step={5}
                    />
                  </div>

                  {/* Personal Line Rate */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>个人线推进速率 (sulv2)</Label>
                      <Badge variant="outline">{plotSettings.ratePersonal.toFixed(2)}</Badge>
                    </div>
                    <Slider
                      value={[plotSettings.ratePersonal * 100]}
                      onValueChange={([value]) => updatePlotSettings({ ratePersonal: value / 100 })}
                      min={0}
                      max={200}
                      step={5}
                    />
                  </div>

                  {/* Erotic Rate */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>色情事件推进速率 (sulv3)</Label>
                      <Badge variant="outline">{plotSettings.rateErotic.toFixed(2)}</Badge>
                    </div>
                    <Slider
                      value={[plotSettings.rateErotic * 100]}
                      onValueChange={([value]) => updatePlotSettings({ rateErotic: value / 100 })}
                      min={0}
                      max={200}
                      step={5}
                    />
                  </div>

                  {/* Cuckold Rate */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>绿帽线推进速率 (sulv4)</Label>
                      <Badge variant="outline">{plotSettings.rateCuckold.toFixed(2)}</Badge>
                    </div>
                    <Slider
                      value={[plotSettings.rateCuckold * 100]}
                      onValueChange={([value]) => updatePlotSettings({ rateCuckold: value / 100 })}
                      min={0}
                      max={200}
                      step={5}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loop Tab */}
          <TabsContent value="loop" className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  自动循环设置
                </CardTitle>
                <CardDescription>配置自动剧情生成循环</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>循环提示词</Label>
                  <Textarea
                    value={plotSettings.quickReplyContent}
                    onChange={(e) => updatePlotSettings({ quickReplyContent: e.target.value })}
                    placeholder="输入用于循环发送的快速回复内容..."
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    此内容将在每次循环开始时发送
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>循环延时 (秒)</Label>
                    <Input
                      type="number"
                      value={plotSettings.loopDelay}
                      onChange={(e) => updatePlotSettings({ 
                        loopDelay: parseInt(e.target.value) || 5 
                      })}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>总时长 (分钟)</Label>
                    <Input
                      type="number"
                      value={plotSettings.totalDuration}
                      onChange={(e) => updatePlotSettings({ 
                        totalDuration: parseInt(e.target.value) || 0 
                      })}
                      min={0}
                      placeholder="0 = 无限"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>最大重试次数</Label>
                    <Input
                      type="number"
                      value={plotSettings.maxRetries}
                      onChange={(e) => updatePlotSettings({ 
                        maxRetries: parseInt(e.target.value) || 3 
                      })}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AI上下文轮数</Label>
                    <Input
                      type="number"
                      value={plotSettings.contextTurnCount}
                      onChange={(e) => updatePlotSettings({ 
                        contextTurnCount: parseInt(e.target.value) || 3 
                      })}
                      min={0}
                      max={20}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      标签验证
                    </Label>
                    <Input
                      value={plotSettings.loopTags}
                      onChange={(e) => updatePlotSettings({ loopTags: e.target.value })}
                      placeholder="例如: content, thinking"
                    />
                    <p className="text-xs text-muted-foreground">
                      AI回复必须包含的标签，用逗号分隔
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>最小回复长度</Label>
                    <Input
                      type="number"
                      value={plotSettings.minLength}
                      onChange={(e) => updatePlotSettings({ 
                        minLength: parseInt(e.target.value) || 0 
                      })}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      少于此长度将自动重试
                    </p>
                  </div>
                </div>

                {/* Loop Status */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">循环状态</p>
                      <p className="text-sm text-muted-foreground">
                        {isLooping ? (
                          <span className="text-green-500">正在运行</span>
                        ) : (
                          '未运行'
                        )}
                        {isLooping && ` · 已循环 ${loopCount} 次`}
                      </p>
                    </div>
                    {isLooping && (
                      <Badge className="animate-pulse-glow">运行中</Badge>
                    )}
                  </div>

                  <div className="flex gap-4">
                    {isLooping ? (
                      <Button 
                        onClick={handleStopLoop}
                        variant="destructive"
                        className="flex-1"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        停止循环
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleStartLoop}
                        className="flex-1 glow-primary"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        开始循环
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setLoopCount(0)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      重置计数
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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