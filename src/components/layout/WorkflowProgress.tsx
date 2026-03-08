import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FileUp, Bot, Database, BookOpen, Download } from 'lucide-react';
import { useDatabaseStore } from '@/stores/databaseStore';

const steps = [
  { id: 'import', label: '导入', icon: FileUp, num: '①' },
  { id: 'extract', label: 'AI 处理', icon: Bot, num: '②', parentTab: 'import' },
  { id: 'database', label: '数据编辑', icon: Database, num: '③' },
  { id: 'merge', label: '结果查看', icon: BookOpen, num: '④' },
  { id: 'worldbook', label: '导出世界书', icon: Download, num: '⑤', parentTab: 'merge' },
];

interface WorkflowProgressProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function WorkflowProgress({ activeTab, onTabChange }: WorkflowProgressProps) {
  const { settings } = useDatabaseStore();

  const taskTypeLabels: Record<string, string> = {
    extraction: 'AI 提取',
    summary: '分卷总结',
    diary: '日记生成',
  };

  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const activeIndex = steps.findIndex(s => 
      s.id === activeTab || s.parentTab === activeTab || activeTab === s.id
    );
    
    const step = steps[stepIndex];
    const isActive = step.id === activeTab || step.parentTab === activeTab;
    
    if (isActive) return 'active';
    if (stepIndex < activeIndex) return 'completed';
    return 'upcoming';
  };

  const handleStepClick = (step: typeof steps[0]) => {
    const tab = step.parentTab || step.id;
    onTabChange(tab);
  };

  return (
    <div className="px-6 pt-4 pb-2">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          const label = step.id === 'extract' 
            ? (taskTypeLabels[settings.taskType] || step.label) 
            : step.label;

          return (
            <div key={step.id} className="flex items-center">
              <motion.button
                onClick={() => handleStepClick(step)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  status === 'active' && "bg-primary/20 text-primary border border-primary/30",
                  status === 'completed' && "bg-muted text-muted-foreground hover:bg-muted/80",
                  status === 'upcoming' && "text-muted-foreground/50 hover:text-muted-foreground"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{step.num}</span>
              </motion.button>

              {index < steps.length - 1 && (
                <div className={cn(
                  "w-4 sm:w-8 h-px mx-1",
                  status === 'completed' || status === 'active' ? 'bg-primary/30' : 'bg-border/30'
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
