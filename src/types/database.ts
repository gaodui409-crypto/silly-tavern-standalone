// 数据库核心类型定义

export interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

export interface TableRow {
  id: string;
  cells: Record<string, string | number | boolean | null>;
  isAutoMerged?: boolean;
}

export interface TableSourceData {
  note: string;
  initNode: string;
  insertNode: string;
  updateNode: string;
  deleteNode: string;
}

export interface TableUpdateConfig {
  contextDepth: number;
  updateFrequency: number;
  batchSize: number;
  skipFloors: number;
}

export interface TableExportConfig {
  enabled: boolean;
  splitByRow: boolean;
  entryName: string;
  entryType: 'constant' | 'keyword';
  preventRecursion: boolean;
  injectIntoWorldbook: boolean;
}

export interface TableSheet {
  uid: string;
  name: string;
  domain: 'chat' | 'global';
  type: 'dynamic' | 'static';
  enable: boolean;
  required: boolean;
  orderNo?: number;
  content: (string | number | null)[][];
  sourceData: TableSourceData;
  updateConfig: TableUpdateConfig;
  exportConfig: TableExportConfig;
}

export interface DatabaseData {
  [sheetKey: string]: TableSheet;
}

export interface ApiConfig {
  url: string;
  apiKey: string;
  model: string;
  useMainApi: boolean;
  maxTokens: number;
  temperature: number;
}

export interface PromptSegment {
  id?: string;
  name?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  mainSlot?: 'A' | 'B' | '';
  deletable: boolean;
}

export interface PlotPromptItem {
  id: string;
  name: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  deletable: boolean;
}

export interface PlotSettings {
  enabled: boolean;
  prompts: PlotPromptItem[];
  rateMain: number;
  ratePersonal: number;
  rateErotic: number;
  rateCuckold: number;
  extractTags: string;
  contextExtractTags: string;
  contextExcludeTags: string;
  minLength: number;
  contextTurnCount: number;
  loopDelay: number;
  totalDuration: number;
  maxRetries: number;
  quickReplyContent: string;
  loopTags: string;
}

export interface WorldbookConfig {
  source: 'character' | 'manual';
  manualSelection: string[];
  enabledEntries: Record<string, string[]>;
  injectionTarget: string;
  outlineEntryEnabled: boolean;
  zeroTkOccupyMode?: boolean;
}

export interface MergeSettings {
  promptTemplate: string;
  targetCount: number;
  batchSize: number;
  startIndex: number;
  endIndex: number | null;
  autoEnabled: boolean;
  autoThreshold: number;
  autoReserve: number;
}

export interface AppSettings {
  apiConfig: ApiConfig;
  apiMode: 'custom' | 'tavern';
  tavernProfile: string;
  charCardPrompt: PromptSegment[];
  autoUpdateThreshold: number;
  autoUpdateFrequency: number;
  autoUpdateTokenThreshold: number;
  updateBatchSize: number;
  autoUpdateEnabled: boolean;
  plotSettings: PlotSettings;
  tableContextExtractTags: string;
  tableContextExcludeTags: string;
  importSplitSize: number;
  skipUpdateFloors: number;
  tableKeyOrder: string[];
  manualSelectedTables: string[];
  importSelectedTables: string[];
  dataIsolationEnabled: boolean;
  dataIsolationCode: string;
  worldbookConfig: WorldbookConfig;
  mergeSettings: MergeSettings;
}

export interface IsolationProfile {
  code: string;
  settings: Partial<AppSettings>;
  template: string;
  lastUsed: number;
}

export interface GlobalMeta {
  version: number;
  activeIsolationCode: string;
  isolationCodeList: string[];
}

export interface ImportStatus {
  total: number;
  currentIndex: number;
  selectionSig?: string;
}

export interface ImportChunk {
  content: string;
  index?: number;
}
