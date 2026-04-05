// ─── Character ──────────────────────────────────────────────────────────────

export interface Character {
  id: string;
  name: string;
  description?: string;
  externalId?: string;
  visibility: "PRIVATE" | "PUBLIC";
  memoryMode: MemoryMode;
  memoryCount: number;
  profile?: CharacterProfile;
  agentConfig?: AgentConfig;
  aliases: CharacterAlias[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CharacterAlias {
  alias: string;
  sourceHint?: string;
}

export type MemoryMode = "EXTRACTED" | "VERBATIM" | "HYBRID";

export interface CharacterProfile {
  systemPrompt?: string;
  personality?: string;
  background?: string;
  rules: string[];
  customFields: Record<string, string>;
}

export interface CharacterListResponse {
  characters: Character[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface CreateCharacterOptions {
  name: string;
  description?: string;
  visibility?: "PRIVATE" | "PUBLIC";
  categoryPreset?: string;
}

export interface UpdateCharacterOptions {
  name?: string;
  description?: string;
  memoryMode?: MemoryMode;
}

export interface ListCharactersOptions {
  page?: number;
  limit?: number;
  tag?: string;
  sortBy?: "CREATED_AT" | "LAST_MEMORY_AT" | "MEMORY_COUNT" | "NAME";
  sortOrder?: "ASC" | "DESC";
  capability?: string;
  agentStatus?: string;
  createdAfter?: string;
  minMemoryCount?: number;
  maxMemoryCount?: number;
}

// ─── Memory ─────────────────────────────────────────────────────────────────

export interface Memory {
  id: string;
  characterId: string;
  content: string;
  category: string;
  salience: number;
  visibility: "PRIVATE" | "PUBLIC";
  state: "ACTIVE" | "DELETED";
  sourceType: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  content: string;
  category: string;
  salience: number;
  score: number;
  createdAt: string;
}

export interface SearchMemoriesResponse {
  results: SearchResult[];
}

export interface MemoryListResponse {
  memories: Memory[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface AddMemoryOptions {
  content: string;
  sourceType?: string;
}

export interface AddMemoryDirectOptions {
  content: string;
  category: string;
  salience?: number;
  visibility?: "PRIVATE" | "PUBLIC";
}

export interface SearchMemoriesOptions {
  query: string;
  topK?: number;
  categories?: string[];
}

export interface ListMemoriesOptions {
  page?: number;
  limit?: number;
  category?: string;
  state?: "ACTIVE" | "DELETED";
}

export interface UpdateMemoryOptions {
  content: string;
  salience?: number;
}

// ─── Category ───────────────────────────────────────────────────────────────

export interface Category {
  name: string;
  description?: string;
  memoryCount: number;
  importance: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  halfLifeDays: number;
  extractionHints: string[];
}

export interface AddCategoryOptions {
  name: string;
  description?: string;
  importance?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  halfLifeDays?: number;
  extractionHints?: string[];
}

// ─── Tags ───────────────────────────────────────────────────────────────────

export interface TagResponse {
  characterId: string;
  tags: string[];
}

// ─── Agent Config ───────────────────────────────────────────────────────────

export interface AgentConfig {
  systemPrompt?: string;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  responseFormat?: "TEXT" | "JSON" | "MARKDOWN";
  metadata?: Record<string, string>;
}

// ─── Character Template ─────────────────────────────────────────────────────

export interface CharacterTemplate {
  id: string;
  name: string;
  description: string;
  categories: CategoryDefinition[];
  defaultValues: Record<string, string>;
  fieldMappings: FieldMapping[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDefinition {
  categoryName: string;
  purpose?: string;
}

export interface FieldMapping {
  sourceColumn: string;
  targetField: string;
}

export interface CreateCharacterTemplateOptions {
  name: string;
  description?: string;
  categories?: CategoryDefinition[];
  fieldMappings?: FieldMapping[];
  defaultValues?: Record<string, string>;
}

// ─── Batch ──────────────────────────────────────────────────────────────────

/**
 * Raw batch job shape returned by the backend API.
 * @internal
 */
export interface BatchJobApiResponse {
  jobId: string;
  type: string;
  status: "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  dryRun: boolean;
  progress: {
    totalRows: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
  errors: { rowIndex: number; externalId?: string; message: string }[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/** Normalised batch job returned by the SDK. */
export interface BatchJob {
  jobId: string;
  status: "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  dryRun: boolean;
  totalRows: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: BatchRowError[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BatchRowError {
  rowIndex: number;
  externalId?: string;
  message: string;
}

export interface BatchCreateOptions {
  templateId: string;
  /** Rows of data. Each key is a column header, each value is the cell value. */
  rows: Record<string, string>[];
  externalIdColumn: string;
  onConflict?: "SKIP" | "UPDATE" | "ERROR";
  dryRun?: boolean;
}

// ─── Clone ──────────────────────────────────────────────────────────────────

export interface CloneResult {
  sourceCharacterId: string;
  clonedCharacterId: string;
  clonedCharacter: Character;
  memoriesCopied: number;
}

export interface CloneCharacterOptions {
  name: string;
  externalId?: string;
  copyTags?: boolean;
  copyMemories?: boolean;
  agentConfigOverride?: AgentConfig;
}

// ─── Agent Config Template ──────────────────────────────────────────────────

export interface AgentConfigTemplate {
  id: string;
  name: string;
  config: AgentConfig;
  createdAt: string;
  updatedAt: string;
}

// ─── Profile Update ─────────────────────────────────────────────────────────

export interface UpdateProfileOptions {
  systemPrompt?: string;
  personality?: string;
  background?: string;
  rules?: string[];
  customFields?: Record<string, string>;
}

// ─── Assembled Context ──────────────────────────────────────────────────────

export type AssemblyStrategy =
  | "default"
  | "conversational"
  | "task_focused"
  | "concierge"
  | "matching";

export interface AssembleContextOptions {
  strategy?: AssemblyStrategy;
  topK?: number;
  categories?: string[];
  includeProfile?: boolean;
  includeConfig?: boolean;
}

export interface AssembledContext {
  systemPrompt: string;
  profile?: CharacterProfile;
  memories: SearchResult[];
  config?: AgentConfig;
  formattedPrompt: string;
  tokenEstimate: number;
  strategy: AssemblyStrategy;
}
