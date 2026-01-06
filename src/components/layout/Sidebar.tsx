import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Table2, 
  Settings, 
  FileUp, 
  Sparkles, 
  Layers,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  BookOpen,
  Merge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDatabaseStore } from '@/stores/databaseStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'database', label: '数据库', icon: Database },
  { id: 'settings', label: 'API设置', icon: Settings },
  { id: 'prompts', label: '提示词', icon: BookOpen },
  { id: 'import', label: '外部导入', icon: FileUp },
  { id: 'plot', label: '剧情推进', icon: Sparkles },
  { id: 'merge', label: '合并总结', icon: Merge },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { 
    database, 
    currentSheetKey, 
    setCurrentSheet, 
    addSheet, 
    deleteSheet,
    moveSheet 
  } = useDatabaseStore();
  
  const [newTableName, setNewTableName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const sortedSheets = Object.entries(database)
    .map(([key, sheet]) => ({ key, ...sheet }))
    .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));

  const handleAddTable = () => {
    if (newTableName.trim()) {
      addSheet(newTableName.trim());
      setNewTableName('');
      setIsAddDialogOpen(false);
      onTabChange('database');
    }
  };

  return (
    <div className="w-64 h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg gradient-text">TavernDB</h1>
            <p className="text-xs text-muted-foreground">数据库管理器</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="divider-gradient mx-4 my-2" />

      {/* Tables List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            数据表
          </span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建表格</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="表格名称"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
                />
                <Button onClick={handleAddTable}>创建</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1 px-2">
          <AnimatePresence>
            {sortedSheets.map((sheet, index) => {
              const isActive = sheet.key === currentSheetKey && activeTab === 'database';
              const isFirst = index === 0;
              const isLast = index === sortedSheets.length - 1;

              return (
                <motion.div
                  key={sheet.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2 rounded-lg mb-1 cursor-pointer transition-all",
                    isActive 
                      ? "bg-primary/10 border border-primary/30" 
                      : "hover:bg-sidebar-accent/50"
                  )}
                  onClick={() => {
                    setCurrentSheet(sheet.key);
                    onTabChange('database');
                  }}
                >
                  <Table2 className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "flex-1 text-sm truncate",
                    isActive ? "text-primary font-medium" : "text-sidebar-foreground"
                  )}>
                    {sheet.name}
                  </span>
                  
                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSheet(sheet.key, 'up');
                      }}
                      disabled={isFirst}
                      className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSheet(sheet.key, 'down');
                      }}
                      disabled={isLast}
                      className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定删除表格 "${sheet.name}"?`)) {
                          deleteSheet(sheet.key);
                        }
                      }}
                      className="p-1 hover:bg-destructive/20 hover:text-destructive rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground text-center">
          独立版 v1.0
        </div>
      </div>
    </div>
  );
}
