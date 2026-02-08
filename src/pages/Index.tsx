import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TableEditor } from '@/components/database/TableEditor';
import { ApiSettings } from '@/components/settings/ApiSettings';
import { PromptSettings } from '@/components/settings/PromptSettings';
import { ImportPanel } from '@/components/import/ImportPanel';
import { PlotPanel } from '@/components/plot/PlotPanel';
import { MergePanel } from '@/components/merge/MergePanel';

const Index = () => {
  // 默认打开导入页面作为起始点
  const [activeTab, setActiveTab] = useState('import');
  const renderContent = () => {
    switch (activeTab) {
      case 'database':
        return <TableEditor />;
      case 'settings':
        return <ApiSettings />;
      case 'prompts':
        return <PromptSettings />;
      case 'import':
        return <ImportPanel />;
      case 'plot':
        return <PlotPanel />;
      case 'merge':
        return <MergePanel />;
      default:
        return <TableEditor />;
    }
  };

  return (
    <div className="h-screen flex bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
