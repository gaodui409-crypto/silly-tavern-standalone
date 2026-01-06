import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  DatabaseData, 
  TableSheet, 
  AppSettings, 
  GlobalMeta, 
  IsolationProfile,
  PromptSegment,
  PlotSettings,
  WorldbookConfig,
  MergeSettings
} from '@/types/database';

// 默认提示词模板
const DEFAULT_CHAR_CARD_PROMPT = `你是一个数据库管理AI，负责分析对话内容并更新相应的数据表。

## 任务说明
根据提供的对话内容，分析并更新以下数据库表格。

## 输出格式
使用 <tableEdit> 标签包裹你的编辑指令：
<tableEdit>
<!-- insertRow(tableIndex, {"columnIndex": "value"}) -->
<!-- updateRow(tableIndex, rowIndex, {"columnIndex": "newValue"}) -->
<!-- deleteRow(tableIndex, rowIndex) -->
</tableEdit>`;

const DEFAULT_PLOT_SETTINGS: PlotSettings = {
  mainPrompt: '',
  systemPrompt: '',
  finalDirective: '',
  rateMain: 1.0,
  ratePersonal: 1.0,
  rateErotic: 0,
  rateCuckold: 1.0,
  loopDelay: 5,
  totalDuration: 0,
  maxRetries: 3,
  contextTurnCount: 3,
  extractTags: '',
  contextExtractTags: '',
  contextExcludeTags: '',
  minLength: 0,
  quickReplyContent: '',
  loopTags: '',
};

const DEFAULT_WORLDBOOK_CONFIG: WorldbookConfig = {
  source: 'character',
  manualSelection: [],
  enabledEntries: {},
  injectionTarget: 'character',
  outlineEntryEnabled: true,
};

const DEFAULT_MERGE_SETTINGS: MergeSettings = {
  promptTemplate: `请将以下总结内容合并为 $TARGET_COUNT 条精简的总结：

## 总结表数据
$A

## 大纲表数据
$B

## 当前基础数据
$BASE_DATA

请使用 <tableEdit> 格式输出合并后的结果。`,
  targetCount: 1,
  batchSize: 5,
  startIndex: 1,
  endIndex: null,
  autoEnabled: false,
  autoThreshold: 20,
  autoReserve: 0,
};

const DEFAULT_SETTINGS: AppSettings = {
  apiConfig: {
    url: '',
    apiKey: '',
    model: '',
    useMainApi: true,
    maxTokens: 60000,
    temperature: 0.9,
  },
  apiMode: 'custom',
  tavernProfile: '',
  charCardPrompt: [{ role: 'system', content: DEFAULT_CHAR_CARD_PROMPT, mainSlot: 'A', deletable: false }],
  autoUpdateThreshold: 3,
  autoUpdateFrequency: 1,
  autoUpdateTokenThreshold: 500,
  updateBatchSize: 3,
  autoUpdateEnabled: true,
  plotSettings: DEFAULT_PLOT_SETTINGS,
  tableContextExtractTags: '',
  tableContextExcludeTags: '',
  importSplitSize: 10000,
  skipUpdateFloors: 0,
  tableKeyOrder: [],
  manualSelectedTables: [],
  importSelectedTables: [],
  dataIsolationEnabled: false,
  dataIsolationCode: '',
  worldbookConfig: DEFAULT_WORLDBOOK_CONFIG,
  mergeSettings: DEFAULT_MERGE_SETTINGS,
};

// 默认表格模板
const DEFAULT_TABLE_TEMPLATE: DatabaseData = {
  sheet_summary: {
    uid: 'sheet_summary',
    name: '总结表',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: true,
    orderNo: 0,
    content: [
      [null, '时间范围', '事件总结', '编码索引'],
    ],
    sourceData: {
      note: '用于存储对话的时间线总结',
      initNode: '',
      insertNode: '',
      updateNode: '',
      deleteNode: '',
    },
    updateConfig: {
      contextDepth: 0,
      updateFrequency: 0,
      batchSize: 0,
      skipFloors: 0,
    },
    exportConfig: {
      enabled: false,
      splitByRow: true,
      entryName: '总结条目',
      entryType: 'keyword',
      preventRecursion: true,
      injectIntoWorldbook: true,
    },
  },
  sheet_outline: {
    uid: 'sheet_outline',
    name: '总体大纲',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: true,
    orderNo: 1,
    content: [
      [null, '章节', '大纲内容', '编码索引'],
    ],
    sourceData: {
      note: '用于存储剧情大纲',
      initNode: '',
      insertNode: '',
      updateNode: '',
      deleteNode: '',
    },
    updateConfig: {
      contextDepth: 0,
      updateFrequency: 0,
      batchSize: 0,
      skipFloors: 0,
    },
    exportConfig: {
      enabled: false,
      splitByRow: false,
      entryName: '剧情大纲',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: true,
    },
  },
  sheet_characters: {
    uid: 'sheet_characters',
    name: '重要人物表',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    orderNo: 2,
    content: [
      [null, '姓名', '身份', '特征', '关系'],
    ],
    sourceData: {
      note: '用于存储重要角色信息',
      initNode: '',
      insertNode: '',
      updateNode: '',
      deleteNode: '',
    },
    updateConfig: {
      contextDepth: 0,
      updateFrequency: 0,
      batchSize: 0,
      skipFloors: 0,
    },
    exportConfig: {
      enabled: false,
      splitByRow: false,
      entryName: '重要人物',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: true,
    },
  },
};

interface DatabaseState {
  // 数据
  database: DatabaseData;
  settings: AppSettings;
  globalMeta: GlobalMeta;
  profiles: Record<string, IsolationProfile>;
  
  // UI 状态
  currentSheetKey: string | null;
  isEditing: boolean;
  isUpdating: boolean;
  updateProgress: number;
  
  // 操作
  setDatabase: (data: DatabaseData) => void;
  updateSheet: (sheetKey: string, sheet: Partial<TableSheet>) => void;
  addSheet: (name: string) => string;
  deleteSheet: (sheetKey: string) => void;
  moveSheet: (sheetKey: string, direction: 'up' | 'down') => void;
  
  addRow: (sheetKey: string, rowData?: Record<string, string | number | null>) => void;
  updateRow: (sheetKey: string, rowIndex: number, colIndex: number, value: string | number | null) => void;
  deleteRow: (sheetKey: string, rowIndex: number) => void;
  
  setSettings: (settings: Partial<AppSettings>) => void;
  setCurrentSheet: (sheetKey: string | null) => void;
  
  switchProfile: (code: string) => void;
  saveCurrentProfile: () => void;
  
  resetToTemplate: () => void;
  importDatabase: (data: DatabaseData) => void;
  exportDatabase: () => DatabaseData;
  
  setIsUpdating: (value: boolean) => void;
  setUpdateProgress: (value: number) => void;
}

export const useDatabaseStore = create<DatabaseState>()(
  persist(
    (set, get) => ({
      database: DEFAULT_TABLE_TEMPLATE,
      settings: DEFAULT_SETTINGS,
      globalMeta: {
        version: 1,
        activeIsolationCode: '',
        isolationCodeList: [],
      },
      profiles: {},
      currentSheetKey: 'sheet_summary',
      isEditing: false,
      isUpdating: false,
      updateProgress: 0,

      setDatabase: (data) => set({ database: data }),

      updateSheet: (sheetKey, updates) => set((state) => ({
        database: {
          ...state.database,
          [sheetKey]: {
            ...state.database[sheetKey],
            ...updates,
          },
        },
      })),

      addSheet: (name) => {
        const newKey = 'sheet_' + Math.random().toString(36).substr(2, 9);
        const state = get();
        const sheets = Object.values(state.database) as TableSheet[];
        const maxOrder = Math.max(0, ...sheets.map(s => s.orderNo ?? 0));
        
        const newSheet: TableSheet = {
          uid: newKey,
          name,
          domain: 'chat',
          type: 'dynamic',
          enable: true,
          required: false,
          orderNo: maxOrder + 1,
          content: [[null, '列1', '列2']],
          sourceData: {
            note: '',
            initNode: '',
            insertNode: '',
            updateNode: '',
            deleteNode: '',
          },
          updateConfig: {
            contextDepth: 0,
            updateFrequency: 0,
            batchSize: 0,
            skipFloors: 0,
          },
          exportConfig: {
            enabled: false,
            splitByRow: false,
            entryName: name,
            entryType: 'constant',
            preventRecursion: true,
            injectIntoWorldbook: true,
          },
        };

        set((state) => ({
          database: {
            ...state.database,
            [newKey]: newSheet,
          },
          currentSheetKey: newKey,
        }));

        return newKey;
      },

      deleteSheet: (sheetKey) => set((state) => {
        const { [sheetKey]: _, ...rest } = state.database;
        const keys = Object.keys(rest);
        return {
          database: rest,
          currentSheetKey: keys.length > 0 ? keys[0] : null,
        };
      }),

      moveSheet: (sheetKey, direction) => set((state) => {
        const sheets = Object.entries(state.database)
          .map(([key, value]) => [key, value as TableSheet] as const)
          .sort(([, a], [, b]) => (a.orderNo ?? 0) - (b.orderNo ?? 0));
        
        const currentIndex = sheets.findIndex(([key]) => key === sheetKey);
        if (currentIndex === -1) return state;
        
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= sheets.length) return state;
        
        // Swap order numbers
        const currentSheet = sheets[currentIndex][1];
        const targetSheet = sheets[newIndex][1];
        const currentOrderNo = currentSheet.orderNo ?? currentIndex;
        const targetOrderNo = targetSheet.orderNo ?? newIndex;
        
        return {
          database: {
            ...state.database,
            [sheets[currentIndex][0]]: {
              ...currentSheet,
              orderNo: targetOrderNo,
            },
            [sheets[newIndex][0]]: {
              ...targetSheet,
              orderNo: currentOrderNo,
            },
          },
        };
      }),

      addRow: (sheetKey, rowData) => set((state) => {
        const sheet = state.database[sheetKey];
        if (!sheet) return state;
        
        const headers = sheet.content[0] || [];
        const newRow: (string | number | null)[] = headers.map((_, idx) => {
          if (idx === 0) return null;
          if (rowData) {
            const colKey = String(idx);
            return rowData[colKey] ?? '';
          }
          return '';
        });
        
        return {
          database: {
            ...state.database,
            [sheetKey]: {
              ...sheet,
              content: [...sheet.content, newRow],
            },
          },
        };
      }),

      updateRow: (sheetKey, rowIndex, colIndex, value) => set((state) => {
        const sheet = state.database[sheetKey];
        if (!sheet || rowIndex < 1 || rowIndex >= sheet.content.length) return state;
        
        const newContent = [...sheet.content];
        newContent[rowIndex] = [...newContent[rowIndex]];
        newContent[rowIndex][colIndex] = value;
        
        return {
          database: {
            ...state.database,
            [sheetKey]: {
              ...sheet,
              content: newContent,
            },
          },
        };
      }),

      deleteRow: (sheetKey, rowIndex) => set((state) => {
        const sheet = state.database[sheetKey];
        if (!sheet || rowIndex < 1 || rowIndex >= sheet.content.length) return state;
        
        return {
          database: {
            ...state.database,
            [sheetKey]: {
              ...sheet,
              content: sheet.content.filter((_, idx) => idx !== rowIndex),
            },
          },
        };
      }),

      setSettings: (newSettings) => set((state) => ({
        settings: {
          ...state.settings,
          ...newSettings,
        },
      })),

      setCurrentSheet: (sheetKey) => set({ currentSheetKey: sheetKey }),

      switchProfile: (code) => {
        const state = get();
        const trimmedCode = code.trim();
        
        // 保存当前 profile
        if (state.globalMeta.activeIsolationCode || !trimmedCode) {
          const currentCode = state.globalMeta.activeIsolationCode || '__default__';
          state.saveCurrentProfile();
        }
        
        // 切换到新 profile
        const profileKey = trimmedCode || '__default__';
        const profile = state.profiles[profileKey];
        
        if (profile) {
          set({
            settings: { ...DEFAULT_SETTINGS, ...profile.settings },
            globalMeta: {
              ...state.globalMeta,
              activeIsolationCode: trimmedCode,
              isolationCodeList: trimmedCode 
                ? [...new Set([trimmedCode, ...state.globalMeta.isolationCodeList])].slice(0, 20)
                : state.globalMeta.isolationCodeList,
            },
          });
        } else {
          // 创建新 profile
          set({
            globalMeta: {
              ...state.globalMeta,
              activeIsolationCode: trimmedCode,
              isolationCodeList: trimmedCode 
                ? [...new Set([trimmedCode, ...state.globalMeta.isolationCodeList])].slice(0, 20)
                : state.globalMeta.isolationCodeList,
            },
            settings: {
              ...state.settings,
              dataIsolationCode: trimmedCode,
              dataIsolationEnabled: !!trimmedCode,
            },
          });
        }
      },

      saveCurrentProfile: () => {
        const state = get();
        const code = state.globalMeta.activeIsolationCode || '__default__';
        
        set({
          profiles: {
            ...state.profiles,
            [code]: {
              code,
              settings: state.settings,
              template: JSON.stringify(state.database),
              lastUsed: Date.now(),
            },
          },
        });
      },

      resetToTemplate: () => set({
        database: JSON.parse(JSON.stringify(DEFAULT_TABLE_TEMPLATE)),
        currentSheetKey: 'sheet_summary',
      }),

      importDatabase: (data) => set({
        database: data,
        currentSheetKey: Object.keys(data)[0] || null,
      }),

      exportDatabase: () => get().database,

      setIsUpdating: (value) => set({ isUpdating: value }),
      setUpdateProgress: (value) => set({ updateProgress: value }),
    }),
    {
      name: 'tavern-db-storage',
      partialize: (state) => ({
        database: state.database,
        settings: state.settings,
        globalMeta: state.globalMeta,
        profiles: state.profiles,
      }),
    }
  )
);
