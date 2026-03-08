import { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// CORS代理列表
const CORS_PROXIES = [
  { name: '代理1 (corsproxy.io)', url: 'https://corsproxy.io/?' },
  { name: '代理2 (allorigins)', url: 'https://api.allorigins.win/raw?url=' },
  { name: '无代理 (直连)', url: '' }
];

// 内置测试API配置
const TEST_API_PRESETS = {
  test: {
    name: '测试API (Canopywave)',
    url: 'https://inference.canopywave.io/v1',
    apiKey: '-5RYFjlVZWcROssj25mj8CxHbj_1rNnNuSokMcorMiQ',
    models: ['moonshotai/kimi-k2.5', 'Qwen/Qwen3-32B', 'deepseek-ai/DeepSeek-V3-0324']
  }
};

export function ApiSettings() {
  const { settings, setSettings } = useDatabaseStore();
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [useBuiltinApi, setUseBuiltinApi] = useState(
    settings.apiConfig.url === TEST_API_PRESETS.test.url
  );
  const [selectedProxy, setSelectedProxy] = useState(
    settings.apiConfig.corsProxy || CORS_PROXIES[0].url
  );

  const apiConfig = settings.apiConfig;

  const handleUseBuiltinApi = (checked: boolean) => {
    setUseBuiltinApi(checked);
    if (checked) {
      const preset = TEST_API_PRESETS.test;
      setSettings({
        apiConfig: {
          ...apiConfig,
          url: preset.url,
          apiKey: preset.apiKey,
          model: preset.models[0],
          useMainApi: false,
          corsProxy: selectedProxy
        }
      });
      setModels(preset.models);
      setConnectionStatus('success');
      toast.success('已切换到内置测试API');
    } else {
      setSettings({
        apiConfig: {
          ...apiConfig,
          url: '',
          apiKey: '',
          model: ''
        }
      });
      setModels([]);
      setConnectionStatus('idle');
    }
  };

  const handleTestConnection = async () => {
    if (!apiConfig.url) {
      toast.error('请先输入API地址');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('idle');

    const baseUrl = `${apiConfig.url}/chat/completions`;
    const corsProxy = apiConfig.corsProxy || selectedProxy;
    const testUrl = corsProxy ? `${corsProxy}${encodeURIComponent(baseUrl)}` : baseUrl;
    
    console.log('[API Test] 开始测试连接');
    console.log('[API Test] 原始URL:', baseUrl);
    console.log('[API Test] CORS代理:', corsProxy || '无');
    console.log('[API Test] 最终URL:', testUrl);
    console.log('[API Test] 使用模型:', apiConfig.model || 'moonshotai/kimi-k2.5');

    try {
      const requestBody = {
        model: apiConfig.model || 'moonshotai/kimi-k2.5',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 10,
        temperature: 0.1
      };
      
      console.log('[API Test] 请求体:', JSON.stringify(requestBody));

      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[API Test] 响应状态:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('[API Test] 响应内容:', responseText.substring(0, 500));

      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.choices && data.choices.length > 0) {
          setConnectionStatus('success');
          const reply = data.choices[0].message?.content || '';
          toast.success(`API连接成功！模型回复: "${reply.substring(0, 50)}..."`);
          console.log('[API Test] 成功! 模型回复:', reply);
        } else {
          throw new Error('响应格式异常: ' + responseText.substring(0, 100));
        }
      } else {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      setConnectionStatus('error');
      console.error('[API Test] 错误:', error);
      console.error('[API Test] 错误类型:', error.name);
      console.error('[API Test] 错误消息:', error.message);
      
      // 更详细的错误提示
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        toast.error('网络请求失败 - 可能原因: 1) API地址错误 2) 网络问题 3) CORS限制。请检查浏览器控制台获取详细信息。', {
          duration: 8000
        });
      } else {
        toast.error(`连接失败: ${error.message}`, { duration: 5000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    toast.success('设置已保存');
  };

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
            {/* Built-in Test API */}
            <Card className="card-hover border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  快速开始
                </CardTitle>
                <CardDescription>使用内置测试API，无需配置即可体验功能</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">使用内置测试API</Label>
                    <p className="text-sm text-muted-foreground">
                      自动配置 Canopywave API (Qwen3-32B)
                    </p>
                  </div>
                  <Switch
                    checked={useBuiltinApi}
                    onCheckedChange={handleUseBuiltinApi}
                  />
                </div>
                {useBuiltinApi && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-600">
                      ✓ 测试API已激活 (moonshotai/kimi-k2.5)
                    </div>
                    <Button 
                      onClick={handleTestConnection}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : connectionStatus === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      ) : connectionStatus === 'error' ? (
                        <XCircle className="w-4 h-4 mr-2 text-red-500" />
                      ) : null}
                      检测API连接
                    </Button>
                    
                    {/* CORS Proxy Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        CORS代理
                      </Label>
                      <Select
                        value={selectedProxy}
                        onValueChange={(value) => {
                          setSelectedProxy(value);
                          setSettings({
                            apiConfig: { ...apiConfig, corsProxy: value }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择CORS代理" />
                        </SelectTrigger>
                        <SelectContent>
                          {CORS_PROXIES.map((proxy) => (
                            <SelectItem key={proxy.url} value={proxy.url}>
                              {proxy.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        通过代理服务绕过浏览器CORS限制
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Mode Selection */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  自定义API
                </CardTitle>
                <CardDescription>或者配置您自己的API端点</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>使用自定义API</Label>
                    <p className="text-sm text-muted-foreground">直接连接到OpenAI兼容的API端点</p>
                  </div>
                  <Switch
                    checked={!apiConfig.useMainApi && !useBuiltinApi}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setUseBuiltinApi(false);
                      }
                      setSettings({ 
                        apiConfig: { ...apiConfig, useMainApi: !checked } 
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom API Configuration */}
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ 
                opacity: !apiConfig.useMainApi ? 1 : 0.5,
                height: 'auto'
              }}
            >
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    自定义API配置
                  </CardTitle>
                  <CardDescription>输入您的API端点信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* API URL */}
                  <div className="space-y-2">
                    <Label htmlFor="api-url" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      API地址
                    </Label>
                    <Input
                      id="api-url"
                      placeholder="https://api.openai.com"
                      value={apiConfig.url}
                      onChange={(e) => setSettings({
                        apiConfig: { ...apiConfig, url: e.target.value }
                      })}
                      className="input-glow"
                    />
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label htmlFor="api-key" className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      API密钥
                    </Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={apiConfig.apiKey}
                      onChange={(e) => setSettings({
                        apiConfig: { ...apiConfig, apiKey: e.target.value }
                      })}
                      className="input-glow"
                    />
                  </div>

                  {/* Test Connection */}
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={handleTestConnection}
                      disabled={isLoading}
                      variant="outline"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : connectionStatus === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      ) : connectionStatus === 'error' ? (
                        <XCircle className="w-4 h-4 mr-2 text-red-500" />
                      ) : null}
                      测试连接并加载模型
                    </Button>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="model" className="flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      模型
                    </Label>
                    {models.length > 0 ? (
                      <Select
                        value={apiConfig.model}
                        onValueChange={(value) => setSettings({
                          apiConfig: { ...apiConfig, model: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="model"
                        placeholder="gpt-4-turbo"
                        value={apiConfig.model}
                        onChange={(e) => setSettings({
                          apiConfig: { ...apiConfig, model: e.target.value }
                        })}
                        className="input-glow"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            {/* Generation Parameters */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-primary" />
                  生成参数
                </CardTitle>
                <CardDescription>调整AI生成行为</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Max Tokens */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      最大Token数
                    </Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {apiConfig.maxTokens}
                    </span>
                  </div>
                  <Slider
                    value={[apiConfig.maxTokens]}
                    onValueChange={([value]) => setSettings({
                      apiConfig: { ...apiConfig, maxTokens: value }
                    })}
                    min={1000}
                    max={128000}
                    step={1000}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    控制AI回复的最大长度
                  </p>
                </div>

                {/* Temperature */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4" />
                      温度 (Temperature)
                    </Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {apiConfig.temperature.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[apiConfig.temperature * 100]}
                    onValueChange={([value]) => setSettings({
                      apiConfig: { ...apiConfig, temperature: value / 100 }
                    })}
                    min={0}
                    max={200}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    较低值使输出更确定，较高值使输出更随机
                  </p>
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
                  <Switch
                    checked={settings.autoUpdateEnabled}
                    onCheckedChange={(checked) => 
                      setSettings({ autoUpdateEnabled: checked })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>更新阈值 (层数)</Label>
                    <Input
                      type="number"
                      value={settings.autoUpdateThreshold}
                      onChange={(e) => setSettings({ 
                        autoUpdateThreshold: parseInt(e.target.value) || 3 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>更新频率</Label>
                    <Input
                      type="number"
                      value={settings.autoUpdateFrequency}
                      onChange={(e) => setSettings({ 
                        autoUpdateFrequency: parseInt(e.target.value) || 1 
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>批处理大小</Label>
                  <Input
                    type="number"
                    value={settings.updateBatchSize}
                    onChange={(e) => setSettings({ 
                      updateBatchSize: parseInt(e.target.value) || 3 
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    每次更新处理的表格数量
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-4 mt-8">
          <Button
            variant="destructive"
            onClick={async () => {
              if (confirm('确定清除所有数据？此操作不可恢复！')) {
                const { clearAllData } = useDatabaseStore.getState();
                await clearAllData();
                toast.success('所有数据已清除');
                window.location.reload();
              }
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清除所有数据
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCcw className="w-4 h-4 mr-2" />
            重置
          </Button>
          <Button onClick={handleSave} className="glow-primary">
            <Save className="w-4 h-4 mr-2" />
            保存设置
          </Button>
        </div>
      </div>
    </div>
  );
}
