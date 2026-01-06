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

// 默认表格模板 - 与原版SillyTavern插件完全一致
const DEFAULT_TABLE_TEMPLATE: DatabaseData = {
  sheet_global: {
    uid: 'sheet_global',
    name: '全局数据表',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: true,
    orderNo: 0,
    content: [
      [null, '主角当前所在地点', '当前时间', '上轮场景时间', '经过的时间'],
    ],
    sourceData: {
      note: '记录当前主角所在地点及时间相关参数。此表有且仅有一行。\n- 列0: 主角当前所在地点 - 主角当前所在的具体场景名称。\n- 列1: 当前时间 - 游戏世界的当前时间。格式："YYYY-MM-DD HH:MM"，初始化时如果剧情没有明确具体的日期和时间，则必须根据世界观和设定自行设定一个明确的日期时间，不能用未知数代替。\n- 列2: 上轮场景时间 - 上一轮交互结束时的时间。\n- 列3: 经过的时间 - 根据当前与上轮时间计算得出的文本描述（如："几分钟"）。',
      initNode: '插入一条关于当前世界状态的记录。',
      deleteNode: '禁止删除。',
      updateNode: '当主角从当前所在区域离开时，更新所在地点。每轮必须更新时间。',
      insertNode: '禁止操作。',
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
      entryName: '全局数据',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: false,
    },
  },
  sheet_protagonist: {
    uid: 'sheet_protagonist',
    name: '主角信息',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: true,
    orderNo: 1,
    content: [
      [null, '人物名称', '性别/年龄', '外貌特征', '职业/身份', '过往经历', '性格特点'],
    ],
    sourceData: {
      note: '记录主角的核心身份信息。此表有且仅有一行。\n- 列0: 人物名称 - 主角的名字。\n- 列1: 性别/年龄 - 主角的生理性别和年龄。\n- 列2: 外貌特征 - 对主角外貌的客观文字描写。\n- 列3: 职业/身份 - 主角在社会中的主要角色。\n- 列4: 过往经历 - 记录主角的背景故事和后续的关键经历。该列会根据剧情发展持续增量更新，最高不超过300字，超过300字会进行精炼压缩到300字以下。\n- 列5: 性格特点 - 对主角核心性格的概括。',
      initNode: '游戏初始化时，插入主角的唯一条目。',
      deleteNode: '禁止删除。',
      updateNode: '"过往经历"列会根据剧情发展持续增量更新，当主角各项状态发生改变时更新。',
      insertNode: '禁止操作。',
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
      entryName: '主角信息',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: false,
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
      [null, '姓名', '性别/年龄', '外貌特征', '持有的重要物品', '是否离场', '过往经历'],
    ],
    sourceData: {
      note: '记录所有关键NPC的详细信息和动态状态。\n- 列0: 姓名 - NPC的名字。\n- 列1: 性别/年龄 - NPC的生理性别和年龄。\n- 列2: 外貌特征 - 对NPC外貌和当前衣着的详细描述。\n- 列3: 持有的重要物品 - NPC拥有的关键重要物品列表，用分号分隔。\n- 列4: 是否离场 - 每轮需判断该角色是否能直接与主角互动，不能就视为已离场，填写"是"或"否"。\n- 列5: 过往经历 - 记录该角色的背景故事和后续的关键经历，最高不超过300字。',
      initNode: '游戏初始化时为当前在场的重要人物分别插入一个条目',
      deleteNode: '禁止删除',
      updateNode: '条目中已有角色的状态、关系、想法或经历等动态信息变化时更新，如果该角色在剧情中死亡则必须在其姓名旁用小括号备注（已死亡）。',
      insertNode: '剧情中有未记录的重要人物登场时添加。',
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
      entryName: '重要人物表',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: true,
    },
  },
  sheet_skills: {
    uid: 'sheet_skills',
    name: '主角技能表',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    orderNo: 3,
    content: [
      [null, '技能名称', '技能类型', '等级/阶段', '效果描述'],
    ],
    sourceData: {
      note: '记录主角获得的所有技能项目。\n- 列0: 技能名称 - 技能的名称。\n- 列1: 技能类型 - 技能的类别（如："被动"、"主动"）。\n- 列2: 等级/阶段 - 技能的当前等级或阶段。\n- 列3: 效果描述 - 技能在当前等级下的具体效果。',
      initNode: '游戏初始化时，根据设定为主角添加初始技能。',
      deleteNode: '技能因剧情被剥夺或替换时删除。',
      updateNode: '已有技能被升级时，更新其等级/阶段和效果描述。',
      insertNode: '主角获得新的技能时添加。',
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
      entryName: '主角技能表',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: false,
    },
  },
  sheet_inventory: {
    uid: 'sheet_inventory',
    name: '背包物品表',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    orderNo: 4,
    content: [
      [null, '物品名称', '数量', '描述/效果', '类别'],
    ],
    sourceData: {
      note: '记录主角拥有的所有物品、装备。\n- 列0: 物品名称 - 物品的名称。\n- 列1: 数量 - 拥有的数量。\n- 列2: 描述/效果 - 物品的功能或背景描述。\n- 列3: 类别 - 物品的类别（如："武器"、"消耗品"、"杂物"）。',
      initNode: '游戏初始化时，根据剧情与设定添加主角的初始携带物品。',
      deleteNode: '物品被完全消耗、丢弃或摧毁时删除。',
      updateNode: '获得已有的物品，使其数量增加时更新，已有物品状态变化时更新。',
      insertNode: '主角获得背包中没有的全新物品时添加。',
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
      entryName: '背包物品表',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: true,
    },
  },
  sheet_quests: {
    uid: 'sheet_quests',
    name: '任务与事件表',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    orderNo: 5,
    content: [
      [null, '任务名称', '任务类型', '发布者', '详细描述', '当前进度', '任务时限', '奖励', '惩罚'],
    ],
    sourceData: {
      note: '记录所有当前正在进行的任务。\n- 列0: 任务名称 - 任务的标题。\n- 列1: 任务类型 - "主线任务"或"支线任务"。\n- 列2: 发布者 - 发布该任务的角色或势力。\n- 列3: 详细描述 - 任务的目标和要求。\n- 列4: 当前进度 - 对任务完成度的简要描述。\n- 列5: 任务时限 - 完成任务的剩余时间。\n- 列6: 奖励 - 完成任务可获得的奖励。\n- 列7: 惩罚 - 任务失败的后果。',
      initNode: '游戏初始化时，根据剧情与设定添加一条主线剧情',
      deleteNode: '任务完成、失败或过期时删除。',
      updateNode: '任务取得关键进展时进行更新',
      insertNode: '主角接取或触发新的主线或支线任务时添加。',
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
      entryName: '任务与事件表',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: false,
    },
  },
  sheet_summary: {
    uid: 'sheet_summary',
    name: '总结表',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: true,
    orderNo: 6,
    content: [
      [null, '时间跨度', '地点', '纪要', '重要对话', '编码索引'],
    ],
    sourceData: {
      note: '轮次日志，每轮交互后必须立即插入一条新记录。\n- 列0: 时间跨度 - 本轮事件发生的精确时间范围。\n- 列1: 地点 - 本轮事件发生的地点，从大到小描述（例如：国家-城市-具体地点）。\n- 列2: 纪要 - 对正文的客观纪实描述。要求移除记录正文里的所有修辞、对话，以第三方的视角中立客观地记录所有正文中发生的事情，不加任何评论，内容不低于300字。\n- 列3: 重要对话 - 只摘录原文中造成事实重点的重要对白本身(需标明由谁说的)，总token不得超过80token。\n- 列4: 编码索引 - 为本轮总结表生成一个唯一的编码索引，格式为 AMXX，XX从01开始递增。',
      initNode: '故事初始化时，插入一条新记录用作记录正文剧情。',
      deleteNode: '禁止删除。',
      updateNode: '禁止操作。',
      insertNode: '每轮交互结束后，插入一条新记录。',
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
      entryName: '总结表',
      entryType: 'constant',
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
    orderNo: 7,
    content: [
      [null, '时间跨度', '大纲', '编码索引'],
    ],
    sourceData: {
      note: '对每轮的"总结表"进行精炼，形成故事主干。\n- 列0: 时间跨度 - 总结表所记录的时间范围。\n- 列1: 大纲 - 对本轮"总结表"核心事件的精炼概括。\n- 列2: 编码索引 - 必须与当前轮次"总结表"表中的编码索引完全一致。',
      initNode: '故事初始化时，插入一条新记录用作记录初始化剧情。',
      deleteNode: '禁止删除。',
      updateNode: '禁止操作。',
      insertNode: '每轮交互结束后，插入一条新记录。',
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
      entryName: '总体大纲',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: true,
    },
  },
  sheet_options: {
    uid: 'sheet_options',
    name: '选项表',
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    orderNo: 8,
    content: [
      [null, '选项一', '选项二', '选项三', '选项四'],
    ],
    sourceData: {
      note: '记录每轮主角可以进行的动作选项。此表有且仅有一行。\n- 列0: 选项一 - 每轮生成一个符合主角可以进行的动作选项。（符合逻辑的）\n- 列1: 选项二 - 每轮生成一个符合主角可以进行的动作选项。（中立的）。\n- 列2: 选项三 - 每轮生成一个符合主角可以进行的动作选项。（善良的）\n- 列3: 选项四 - 每轮生成一个符合主角可以进行的动作选项。（NSFW相关的）',
      initNode: '游戏初始化时，生成四个初始选项。',
      deleteNode: '禁止删除。',
      updateNode: '每轮交互后必须更新此表，根据当前剧情生成新的四个选项覆盖原有内容。',
      insertNode: '禁止操作。',
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
      entryName: '选项表',
      entryType: 'constant',
      preventRecursion: true,
      injectIntoWorldbook: false,
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
      currentSheetKey: 'sheet_global',
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
        currentSheetKey: 'sheet_global',
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
