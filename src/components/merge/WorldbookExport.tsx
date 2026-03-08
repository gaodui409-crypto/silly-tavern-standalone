import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Download,
  Eye,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorldbookEntry {
  uid: number;
  key: string[];
  keysecondary: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  selectiveLogic: number;
  order: number;
  position: number;
  disable: boolean;
  excludeRecursion: boolean;
  probability: number;
  depth: number;
  group: string;
  scanDepth: null;
  caseSensitive: null;
  matchWholeWords: null;
  automationId: string;
  role: null;
  vectorized: boolean;
}

export function WorldbookExport() {
  const { database } = useDatabaseStore();
  const [selectedTables, setSelectedTables] = useState<string[]>([
    'sheet_protagonist', 'sheet_characters'
  ]);
  const [depth, setDepth] = useState(4);
  const [selective, setSelective] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const sortedSheets = Object.entries(database)
    .map(([key, sheet]) => ({ key, ...sheet }))
    .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));

  const toggleTable = (key: string) => {
    setSelectedTables(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const generateEntries = (): WorldbookEntry[] => {
    const entries: WorldbookEntry[] = [];
    let uid = 0;

    for (const tableKey of selectedTables) {
      const sheet = database[tableKey];
      if (!sheet || sheet.content.length <= 1) continue;

      const headers = sheet.content[0];

      if (tableKey === 'sheet_protagonist') {
        // 主角表：合并所有阶段为一个条目
        const rows = sheet.content.slice(1);
        if (rows.length === 0) continue;

        const name = (rows[0][1] as string) || '主角';
        const contentParts: string[] = [];

        for (const row of rows) {
          const stage = (row[2] as string) || '';
          const parts: string[] = [];
          for (let c = 1; c < headers.length; c++) {
            const header = headers[c] as string;
            const value = row[c];
            if (value && String(value).trim()) {
              parts.push(`${header}: ${value}`);
            }
          }
          contentParts.push(`【${stage || '阶段'}】\n${parts.join('\n')}`);
        }

        entries.push(createEntry(uid++, [name], [], `${name} - ${sheet.name}`, contentParts.join('\n\n'), depth, selective));
      } else if (tableKey === 'sheet_characters') {
        // 重要人物表：每个角色一个条目（按名字分组）
        const rows = sheet.content.slice(1);
        const grouped = new Map<string, typeof rows>();

        for (const row of rows) {
          const name = (row[1] as string) || '';
          if (!name) continue;
          if (!grouped.has(name)) grouped.set(name, []);
          grouped.get(name)!.push(row);
        }

        for (const [name, charRows] of grouped) {
          const alias = (charRows[0][2] as string) || '';
          const keys = [name];
          if (alias && alias !== name && alias !== '初登场') keys.push(alias);

          const contentParts: string[] = [];
          for (const row of charRows) {
            const parts: string[] = [];
            for (let c = 1; c < headers.length; c++) {
              const header = headers[c] as string;
              const value = row[c];
              if (value && String(value).trim()) {
                parts.push(`${header}: ${value}`);
              }
            }
            contentParts.push(parts.join('\n'));
          }

          entries.push(createEntry(uid++, keys, [], `${name} - ${sheet.name}`, contentParts.join('\n---\n'), depth, selective));
        }
      } else {
        // 其他表：每行一个条目
        const rows = sheet.content.slice(1);
        for (const row of rows) {
          const nameCol = (row[1] as string) || '';
          if (!nameCol) continue;

          const parts: string[] = [];
          for (let c = 1; c < headers.length; c++) {
            const header = headers[c] as string;
            const value = row[c];
            if (value && String(value).trim()) {
              parts.push(`${header}: ${value}`);
            }
          }

          entries.push(createEntry(uid++, [nameCol], [], `${nameCol} - ${sheet.name}`, parts.join('\n'), depth, selective));
        }
      }
    }

    // 可选：包含分卷总结
    if (includeSummary) {
      const summarySheet = database['sheet_summary'];
      if (summarySheet && summarySheet.content.length > 1) {
        const rows = summarySheet.content.slice(1);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const index = (row[5] as string) || `AM${String(i + 1).padStart(2, '0')}`;
          const content = (row[3] as string) || '';
          if (content) {
            entries.push(createEntry(uid++, [`第${i + 1}卷概要`, index], [], `分卷总结 ${index}`, content, depth, selective));
          }
        }
      }
    }

    return entries;
  };

  const createEntry = (
    uid: number,
    key: string[],
    keysecondary: string[],
    comment: string,
    content: string,
    entryDepth: number,
    isSelective: boolean,
  ): WorldbookEntry => ({
    uid,
    key,
    keysecondary,
    comment,
    content,
    constant: false,
    selective: isSelective,
    selectiveLogic: 0,
    order: 100,
    position: 0,
    disable: false,
    excludeRecursion: false,
    probability: 100,
    depth: entryDepth,
    group: '',
    scanDepth: null,
    caseSensitive: null,
    matchWholeWords: null,
    automationId: '',
    role: null,
    vectorized: false,
  });

  const previewEntries = generateEntries();

  const handleExport = () => {
    const entries = generateEntries();
    if (entries.length === 0) {
      toast.error('没有可导出的条目，请选择包含数据的表格');
      return;
    }

    const worldbook = {
      entries: Object.fromEntries(entries.map((e, i) => [String(i), e])),
    };

    const blob = new Blob([JSON.stringify(worldbook, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldbook_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`已导出 ${entries.length} 个世界书条目`);
  };

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          世界书导出
        </CardTitle>
        <CardDescription>将数据表导出为 SillyTavern 世界书 JSON 格式</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 数据源选择 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">选择要导出的数据表</Label>
          <div className="grid grid-cols-2 gap-2">
            {sortedSheets.map((sheet) => (
              <motion.div
                key={sheet.key}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all",
                  selectedTables.includes(sheet.key)
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-border"
                )}
                onClick={() => toggleTable(sheet.key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{sheet.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {sheet.content.length - 1} 行
                    </Badge>
                    {selectedTables.includes(sheet.key) && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 导出选项 */}
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="w-4 h-4" />
            导出选项
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Depth（扫描深度）</Label>
              <Input
                type="number"
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value) || 4)}
                min={1}
                max={100}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Selective</Label>
                <p className="text-xs text-muted-foreground">关键词触发</p>
              </div>
              <Switch checked={selective} onCheckedChange={setSelective} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>合并分卷总结</Label>
              <p className="text-xs text-muted-foreground">将总结表数据也作为世界书条目</p>
            </div>
            <Switch checked={includeSummary} onCheckedChange={setIncludeSummary} />
          </div>
        </div>

        {/* 预览 */}
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="w-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? '隐藏预览' : `预览条目 (${previewEntries.length} 个)`}
          </Button>

          {showPreview && previewEntries.length > 0 && (
            <ScrollArea className="h-[300px] rounded-lg border">
              <div className="p-3 space-y-2">
                {previewEntries.map((entry, i) => (
                  <div key={i} className="p-3 rounded bg-muted/50 border border-border/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{entry.key.join(', ')}</Badge>
                      <span className="text-xs text-muted-foreground">{entry.comment}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* 导出按钮 */}
        <Button onClick={handleExport} className="w-full glow-primary" size="lg">
          <Download className="w-4 h-4 mr-2" />
          导出世界书 JSON ({previewEntries.length} 个条目)
        </Button>
      </CardContent>
    </Card>
  );
}
