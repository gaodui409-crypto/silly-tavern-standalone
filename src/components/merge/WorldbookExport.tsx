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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const { database, diaryResults, settings, summaryResults } = useDatabaseStore();
  const [selectedTables, setSelectedTables] = useState<string[]>([
    'sheet_protagonist', 'sheet_characters'
  ]);
  const [includeDiary, setIncludeDiary] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Per-category settings
  const [tableDepth, setTableDepth] = useState(4);
  const [tableSelective, setTableSelective] = useState(true);
  const [summaryDepth, setSummaryDepth] = useState(4);
  const [summarySelective, setSummarySelective] = useState(true);
  const [diaryDepth, setDiaryDepth] = useState(4);
  const [diaryPosition, setDiaryPosition] = useState(4); // 0=Before Char, 1=After Char, 4=At Depth
  const [diaryConstant, setDiaryConstant] = useState(true);

  const sortedSheets = Object.entries(database)
    .map(([key, sheet]) => ({ key, ...sheet }))
    .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));

  const toggleTable = (key: string) => {
    setSelectedTables(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const createEntry = (
    uid: number, key: string[], keysecondary: string[], comment: string,
    content: string, entryDepth: number, isSelective: boolean,
    isConstant: boolean = false, position: number = 0,
  ): WorldbookEntry => ({
    uid, key, keysecondary, comment, content,
    constant: isConstant, selective: isSelective, selectiveLogic: 0, order: 100,
    position, disable: false, excludeRecursion: false, probability: 100,
    depth: entryDepth, group: '', scanDepth: null, caseSensitive: null,
    matchWholeWords: null, automationId: '', role: null, vectorized: false,
  });

  const generateEntries = (): WorldbookEntry[] => {
    const entries: WorldbookEntry[] = [];
    let uid = 0;

    for (const tableKey of selectedTables) {
      const sheet = database[tableKey];
      if (!sheet || sheet.content.length <= 1) continue;
      const headers = sheet.content[0];

      if (tableKey === 'sheet_protagonist') {
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
            if (value && String(value).trim()) parts.push(`${header}: ${value}`);
          }
          contentParts.push(`【${stage || '阶段'}】\n${parts.join('\n')}`);
        }
        entries.push(createEntry(uid++, [name], [], `${name} - ${sheet.name}`, contentParts.join('\n\n'), tableDepth, tableSelective));
      } else if (tableKey === 'sheet_characters') {
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
              if (value && String(value).trim()) parts.push(`${header}: ${value}`);
            }
            contentParts.push(parts.join('\n'));
          }
          entries.push(createEntry(uid++, keys, [], `${name} - ${sheet.name}`, contentParts.join('\n---\n'), tableDepth, tableSelective));
        }
      } else {
        const rows = sheet.content.slice(1);
        for (const row of rows) {
          const nameCol = (row[1] as string) || '';
          if (!nameCol) continue;
          const parts: string[] = [];
          for (let c = 1; c < headers.length; c++) {
            const header = headers[c] as string;
            const value = row[c];
            if (value && String(value).trim()) parts.push(`${header}: ${value}`);
          }
          entries.push(createEntry(uid++, [nameCol], [], `${nameCol} - ${sheet.name}`, parts.join('\n'), tableDepth, tableSelective));
        }
      }
    }

    // Summary entries
    if (includeSummary && summaryResults.length > 0) {
      for (let i = 0; i < summaryResults.length; i++) {
        entries.push(createEntry(uid++, [`第${i + 1}卷概要`], [], `分卷总结 第${i + 1}卷`, summaryResults[i], summaryDepth, summarySelective));
      }
    }

    // Diary entries
    if (includeDiary && diaryResults.length > 0) {
      const charName = settings.chatMeta?.charName || '角色';
      for (let i = 0; i < diaryResults.length; i++) {
        entries.push(createEntry(
          uid++,
          [`${charName}的日记`, `第${i + 1}篇`],
          [],
          `${charName}的日记 第${i + 1}篇`,
          diaryResults[i],
          diaryDepth,
          false,
          diaryConstant,
          diaryPosition,
        ));
      }
    }

    return entries;
  };

  const previewEntries = generateEntries();

  const handleExport = () => {
    const entries = generateEntries();
    if (entries.length === 0) { toast.error('没有可导出的条目'); return; }
    const worldbook = { entries: Object.fromEntries(entries.map((e, i) => [String(i), e])) };
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
          <BookOpen className="w-5 h-5 text-primary" />世界书导出
        </CardTitle>
        <CardDescription>将数据表导出为 SillyTavern 世界书 JSON 格式</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 数据源选择 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">选择要导出的数据表</Label>
          <div className="grid grid-cols-2 gap-2">
            {sortedSheets.map((sheet) => (
              <motion.div key={sheet.key}
                className={cn("p-3 rounded-lg border cursor-pointer transition-all",
                  selectedTables.includes(sheet.key) ? "border-primary bg-primary/10" : "border-border/50 hover:border-border")}
                onClick={() => toggleTable(sheet.key)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{sheet.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">{sheet.content.length - 1} 行</Badge>
                    {selectedTables.includes(sheet.key) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 导出选项 - 按类型分组 */}
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="w-4 h-4" />导出选项
          </div>

          {/* 数据表类 */}
          <div className="space-y-2 p-3 rounded border border-border/30">
            <Label className="text-xs text-muted-foreground">数据表（主角/人物/其他）</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Depth</Label>
                <Input type="number" value={tableDepth} onChange={(e) => setTableDepth(parseInt(e.target.value) || 4)} min={1} max={100} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Selective</Label>
                <Switch checked={tableSelective} onCheckedChange={setTableSelective} />
              </div>
            </div>
          </div>

          {/* 总结类 */}
          <div className="space-y-2 p-3 rounded border border-border/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">分卷总结 ({summaryResults.length} 个)</Label>
              <Switch checked={includeSummary} onCheckedChange={setIncludeSummary} />
            </div>
            {includeSummary && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Depth</Label>
                  <Input type="number" value={summaryDepth} onChange={(e) => setSummaryDepth(parseInt(e.target.value) || 4)} min={1} max={100} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Selective</Label>
                  <Switch checked={summarySelective} onCheckedChange={setSummarySelective} />
                </div>
              </div>
            )}
          </div>

          {/* 日记类 */}
          {diaryResults.length > 0 && (
            <div className="space-y-2 p-3 rounded border border-warning/30 bg-warning/5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-warning">角色日记 ({diaryResults.length} 篇)</Label>
                <Switch checked={includeDiary} onCheckedChange={setIncludeDiary} />
              </div>
              {includeDiary && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Depth</Label>
                    <Input type="number" value={diaryDepth} onChange={(e) => setDiaryDepth(parseInt(e.target.value) || 4)} min={1} max={100} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Position</Label>
                    <Select value={String(diaryPosition)} onValueChange={(v) => setDiaryPosition(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Before Char</SelectItem>
                        <SelectItem value="1">After Char</SelectItem>
                        <SelectItem value="4">At Depth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Constant</Label>
                    <Switch checked={diaryConstant} onCheckedChange={setDiaryConstant} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 预览 */}
        <div className="space-y-3">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="w-full">
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
                      {entry.constant && <Badge variant="secondary" className="text-xs">Constant</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <Button onClick={handleExport} className="w-full glow-primary" size="lg">
          <Download className="w-4 h-4 mr-2" />
          导出世界书 JSON ({previewEntries.length} 个条目)
        </Button>
      </CardContent>
    </Card>
  );
}
