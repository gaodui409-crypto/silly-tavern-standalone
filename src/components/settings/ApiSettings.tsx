import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Key, 
  Globe, 
  Cpu, 
  Thermometer, 
  Hash,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Radio
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { callAI } from '@/lib/apiProxy';
import { cn } from '@/lib/utils';

export function ApiSettings() {
  const { settings, setSettings } = useDatabaseStore();
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [presetInfo, setPresetInfo] = useState<{ name: string; model: string } | null>(null);

  const apiConfig = settings.apiConfig;
  const apiMode = settings.apiMode || 'preset';

  // Fetch presets when in preset mode
  useEffect(() => {
    if (apiMode === 'preset') {
      fetch('/api/presets')
        .then(r => r.json())
        .then(data => {
          const presets = data.presets || [];
          if (presets.length > 0) {
            setPresetInfo({ name: presets[0].name, model: presets[0].model });
            if (!apiConfig.model) {
              setSettings({ apiConfig: { ...apiConfig, model: presets[0].model } });
            }
          }
        })
        .catch(() => setPresetInfo(null));
    }
  }, [apiMode]);

  const handleTestConnection = async () => {
    setIsLoading(true);
    setConnectionStatus('idle');

    try {
      const reply = await callAI({
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 10,
        temperature: 0.1,
      });
      
      setConnectionStatus('success');
      toast.success(`API连接成功！模型回复: "${reply.substring(0, 50)}"`);
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error(`连接失败: ${error.message}`, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    toast.success('设置已保存');
  };

  const needsUrlAndKey = apiMode === 'proxy' || apiMode === 'direct';

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API 设置</h1>
          <p className="text-muted-foreground">配置AI接口以启用自动填表功能</p>
        </div>

        <Tabs defaultValue="api" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api">API配置</TabsTrigger>
            <TabsTrigger value="advanced">高级设置</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-6">
            {/* API Mode Selection */}
            <Card className="card-hover border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" />
                  API 模式
                </CardTitle>
                <CardDescription>选择 AI 请求的发送方式</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={apiMode}
                  onValueChange={(value: 'proxy' | 'preset' | 'direct') => {
                    setSettings({ apiMode: value });
                    setConnectionStatus('idle');
                  }}
                  className="space-y-3"
                >
                  <div className={cn("flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    apiMode === 'preset' ? "border-primary bg-primary/10" : "border-border/50")}>
                    <RadioGroupItem value="preset" id="preset" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="preset" className="font-medium cursor-pointer">预设 API</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">使用后端预设的 API 配置，无需填写密钥</p>
                      {apiMode === 'preset' && presetInfo && (
                        <div className="mt-2 p-2 rounded bg-success/10 border border-success/30 text-xs text-success">
                          ✓ 预设: {presetInfo.name} ({presetInfo.model})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={cn("flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    apiMode === 'proxy' ? "border-primary bg-primary/10" : "border-border/50")}>
                    <RadioGroupItem value="proxy" id="proxy" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="proxy" className="font-medium cursor-pointer">后端代理</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">请求通过后端代理转发，解决 CORS 限制（需填写 URL + Key）</p>
                    </div>
                  </div>

                  <div className={cn("flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    apiMode === 'direct' ? "border-primary bg-primary/10" : "border-border/50")}>
                    <RadioGroupItem value="direct" id="direct" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="direct" className="font-medium cursor-pointer">直连</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">直接连接 API（适用于本地 Ollama 等无 CORS 限制场景）</p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* API Configuration - shown for proxy and direct modes */}
            {needsUrlAndKey && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      API 配置
                    </CardTitle>
                    <CardDescription>
                      {apiMode === 'proxy' ? '请求将通过后端 /api/proxy 转发' : '直接连接到 API 端点'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="api-url" className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />API地址
                      </Label>
                      <Input id="api-url" placeholder="https://api.openai.com/v1"
                        value={apiConfig.url}
                        onChange={(e) => setSettings({ apiConfig: { ...apiConfig, url: e.target.value } })}
                        className="input-glow" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-key" className="flex items-center gap-2">
                        <Key className="w-4 h-4" />API密钥
                      </Label>
                      <Input id="api-key" type="password" placeholder="sk-..."
                        value={apiConfig.apiKey}
                        onChange={(e) => setSettings({ apiConfig: { ...apiConfig, apiKey: e.target.value } })}
                        className="input-glow" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model" className="flex items-center gap-2">
                        <Cpu className="w-4 h-4" />模型
                      </Label>
                      <Input id="model" placeholder="gpt-4-turbo"
                        value={apiConfig.model}
                        onChange={(e) => setSettings({ apiConfig: { ...apiConfig, model: e.target.value } })}
                        className="input-glow" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Test Connection */}
            <Card className="card-hover">
              <CardContent className="p-4">
                <Button onClick={handleTestConnection} disabled={isLoading} className="w-full" variant="outline">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : connectionStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                  ) : connectionStatus === 'error' ? (
                    <XCircle className="w-4 h-4 mr-2 text-destructive" />
                  ) : null}
                  测试连接
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            {/* Generation Parameters */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-primary" />生成参数
                </CardTitle>
                <CardDescription>调整AI生成行为</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><Hash className="w-4 h-4" />最大Token数</Label>
                    <span className="text-sm font-mono text-muted-foreground">{apiConfig.maxTokens}</span>
                  </div>
                  <Slider value={[apiConfig.maxTokens]}
                    onValueChange={([value]) => setSettings({ apiConfig: { ...apiConfig, maxTokens: value } })}
                    min={1000} max={128000} step={1000} className="w-full" />
                  <p className="text-xs text-muted-foreground">控制AI回复的最大长度</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><Thermometer className="w-4 h-4" />温度 (Temperature)</Label>
                    <span className="text-sm font-mono text-muted-foreground">{apiConfig.temperature.toFixed(2)}</span>
                  </div>
                  <Slider value={[apiConfig.temperature * 100]}
                    onValueChange={([value]) => setSettings({ apiConfig: { ...apiConfig, temperature: value / 100 } })}
                    min={0} max={200} step={5} className="w-full" />
                  <p className="text-xs text-muted-foreground">较低值使输出更确定，较高值使输出更随机</p>
                </div>
              </CardContent>
            </Card>

            {/* Auto Update Settings */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>自动更新设置</CardTitle>
                <CardDescription>配置自动填表行为</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>启用自动更新</Label>
                    <p className="text-sm text-muted-foreground">对话时自动更新数据库</p>
                  </div>
                  <Switch checked={settings.autoUpdateEnabled}
                    onCheckedChange={(checked) => setSettings({ autoUpdateEnabled: checked })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>更新阈值 (层数)</Label>
                    <Input type="number" value={settings.autoUpdateThreshold}
                      onChange={(e) => setSettings({ autoUpdateThreshold: parseInt(e.target.value) || 3 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>更新频率</Label>
                    <Input type="number" value={settings.autoUpdateFrequency}
                      onChange={(e) => setSettings({ autoUpdateFrequency: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>批处理大小</Label>
                  <Input type="number" value={settings.updateBatchSize}
                    onChange={(e) => setSettings({ updateBatchSize: parseInt(e.target.value) || 3 })} />
                  <p className="text-xs text-muted-foreground">每次更新处理的表格数量</p>
                </div>
              </CardContent>
            </Card>

            {/* Chat Segment Settings */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>聊天记录分段</CardTitle>
                <CardDescription>配置聊天记录的分段参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>分段大小（消息条数）</Label>
                    <Input type="number" value={settings.chatSegmentSize}
                      onChange={(e) => setSettings({ chatSegmentSize: Math.max(20, Math.min(200, parseInt(e.target.value) || 50)) })}
                      min={20} max={200} />
                  </div>
                  <div className="space-y-2">
                    <Label>重叠条数</Label>
                    <Input type="number" value={settings.chatOverlap}
                      onChange={(e) => setSettings({ chatOverlap: Math.max(0, Math.min(20, parseInt(e.target.value) || 5)) })}
                      min={0} max={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-4 mt-8">
          <Button variant="destructive"
            onClick={async () => {
              if (confirm('确定清除所有数据？此操作不可恢复！')) {
                const { clearAllData } = useDatabaseStore.getState();
                await clearAllData();
                toast.success('所有数据已清除');
                window.location.reload();
              }
            }}>
            <Trash2 className="w-4 h-4 mr-2" />清除所有数据
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCcw className="w-4 h-4 mr-2" />重置
          </Button>
          <Button onClick={handleSave} className="glow-primary">
            <Save className="w-4 h-4 mr-2" />保存设置
          </Button>
        </div>
      </div>
    </div>
  );
}
