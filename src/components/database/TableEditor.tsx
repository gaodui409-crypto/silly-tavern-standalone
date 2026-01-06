import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Download, 
  Upload,
  Settings2,
  GripVertical
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function TableEditor() {
  const { 
    database, 
    currentSheetKey, 
    updateRow, 
    addRow, 
    deleteRow,
    updateSheet,
    exportDatabase,
    importDatabase,
    resetToTemplate
  } = useDatabaseStore();

  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const currentSheet = currentSheetKey ? database[currentSheetKey] : null;

  const handleCellClick = useCallback((rowIndex: number, colIndex: number, value: string | number | null) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(String(value ?? ''));
  }, []);

  const handleCellBlur = useCallback(() => {
    if (editingCell && currentSheetKey) {
      updateRow(currentSheetKey, editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
    }
  }, [editingCell, editValue, currentSheetKey, updateRow]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }, [handleCellBlur]);

  const handleExport = () => {
    const data = exportDatabase();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taverndb-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            importDatabase(data);
          } catch {
            alert('无效的JSON文件');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (!currentSheet) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">请选择一个表格</p>
          <p className="text-sm">或创建新表格开始</p>
        </div>
      </div>
    );
  }

  const headers = currentSheet.content[0] || [];
  const rows = currentSheet.content.slice(1);

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">{currentSheet.name}</h2>
            <p className="text-sm text-muted-foreground">
              {rows.length} 行数据 · {headers.length - 1} 列
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={currentSheet.enable ? 'default' : 'secondary'}>
              {currentSheet.enable ? '启用' : '禁用'}
            </Badge>
            <Badge variant="outline">{currentSheet.type}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            导入
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (confirm('确定重置为默认模板？所有数据将丢失！')) {
                resetToTemplate();
              }
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            重置
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="flex-1 flex flex-col min-h-0 card-hover">
        <CardContent className="flex-1 p-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="min-w-max">
              {/* Header Row */}
              <div className="flex border-b border-border bg-table-header sticky top-0 z-10">
                <div className="w-12 shrink-0 p-3 text-xs font-medium text-muted-foreground">#</div>
                {headers.slice(1).map((header, idx) => (
                  <div
                    key={idx}
                    className="flex-1 min-w-[150px] p-3 text-sm font-semibold text-foreground"
                  >
                    {String(header)}
                  </div>
                ))}
                <div className="w-16 shrink-0 p-3 text-xs font-medium text-muted-foreground text-center">
                  操作
                </div>
              </div>

              {/* Data Rows */}
              <AnimatePresence>
                {rows.map((row, rowIndex) => (
                  <motion.div
                    key={rowIndex}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "flex border-b border-border/50 table-row-interactive",
                      rowIndex % 2 === 1 && "bg-table-row-alt"
                    )}
                  >
                    <div className="w-12 shrink-0 p-3 text-xs text-muted-foreground flex items-center">
                      {rowIndex + 1}
                    </div>
                    {row.slice(1).map((cell, colIndex) => {
                      const actualColIndex = colIndex + 1;
                      const isEditing = editingCell?.row === rowIndex + 1 && editingCell?.col === actualColIndex;
                      
                      return (
                        <div
                          key={colIndex}
                          className="flex-1 min-w-[150px] p-2"
                          onClick={() => handleCellClick(rowIndex + 1, actualColIndex, cell)}
                        >
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellBlur}
                              onKeyDown={handleKeyDown}
                              className="h-8 text-sm input-glow"
                            />
                          ) : (
                            <div className="min-h-[32px] px-2 py-1.5 rounded cursor-pointer hover:bg-white/5 text-sm">
                              {String(cell ?? '')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="w-16 shrink-0 p-2 flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => {
                          if (confirm('确定删除此行？')) {
                            deleteRow(currentSheetKey!, rowIndex + 1);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add Row Button */}
              <motion.div
                className="flex items-center justify-center p-4 border-2 border-dashed border-border/50 m-2 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                onClick={() => addRow(currentSheetKey!)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Plus className="w-5 h-5 mr-2 text-primary" />
                <span className="text-sm font-medium text-primary">添加新行</span>
              </motion.div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Source Data Info */}
      {currentSheet.sourceData?.note && (
        <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">说明：</span> {currentSheet.sourceData.note}
          </p>
        </div>
      )}
    </div>
  );
}
