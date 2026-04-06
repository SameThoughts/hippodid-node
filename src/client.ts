import {
  AuthenticationError,
  HippoDidError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors.js";
import type {
  AddCategoryOptions,
  AddMemoryDirectOptions,
  AddMemoryOptions,
  AgentConfig,
  AgentConfigTemplate,
  AssembleContextOptions,
  AssembledContext,
  BatchCreateOptions,
  BatchJob,
  BatchJobApiResponse,
  Category,
  Character,
  CharacterListResponse,
  CharacterProfile,
  CharacterTemplate,
  CloneCharacterOptions,
  CloneResult,
  CreateCharacterOptions,
  CreateCharacterTemplateOptions,
  ListCharactersOptions,
  ListMemoriesOptions,
  Memory,
  MemoryListResponse,
  MemoryMode,
  SearchMemoriesOptions,
  SearchMemoriesResponse,
  SearchResult,
  TagResponse,
  UpdateCharacterOptions,
  UpdateMemoryOptions,
  UpdateProfileOptions,
} from "./models.js";
import { assembleFromParts } from "./strategies.js";

const DEFAULT_BASE_URL = "https://api.hippodid.com";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

export interface HippoDidOptions {
  apiKey: string;
  baseUrl?: string;
  tenantId?: string;
  /** Maximum retries for 429/5xx errors. Default: 3. */
  maxRetries?: number;
}

export class HippoDid {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly tenantId?: string;
  private readonly maxRetries: number;

  constructor(options: HippoDidOptions) {
    if (!options.apiKey) {
      throw new AuthenticationError("apiKey is required");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.tenantId = options.tenantId;
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Character CRUD
  // ════��══════════════════════════════════════════════════════════════════════

  async createCharacter(options: CreateCharacterOptions): Promise<Character> {
    return this.post<Character>("/v1/characters", options);
  }

  async getCharacter(characterId: string): Promise<Character> {
    return this.get<Character>(`/v1/characters/${characterId}`);
  }

  async getCharacterByExternalId(externalId: string): Promise<Character> {
    return this.get<Character>(`/v1/characters/external/${encodeURIComponent(externalId)}`);
  }

  async listCharacters(options?: ListCharactersOptions): Promise<CharacterListResponse> {
    const params = new URLSearchParams();
    if (options?.page != null) params.set("page", String(options.page));
    if (options?.limit != null) params.set("limit", String(options.limit));
    if (options?.tag) params.set("tag", options.tag);
    if (options?.sortBy) params.set("sortBy", options.sortBy);
    if (options?.sortOrder) params.set("sortOrder", options.sortOrder);
    if (options?.capability) params.set("capability", options.capability);
    if (options?.agentStatus) params.set("agentStatus", options.agentStatus);
    if (options?.createdAfter) params.set("createdAfter", options.createdAfter);
    if (options?.minMemoryCount != null) params.set("minMemoryCount", String(options.minMemoryCount));
    if (options?.maxMemoryCount != null) params.set("maxMemoryCount", String(options.maxMemoryCount));

    const qs = params.toString();
    return this.get<CharacterListResponse>(`/v1/characters${qs ? `?${qs}` : ""}`);
  }

  async updateCharacter(characterId: string, options: UpdateCharacterOptions): Promise<Character> {
    return this.put<Character>(`/v1/characters/${characterId}`, options);
  }

  async deleteCharacter(characterId: string, mode: "soft" | "hard_delete" = "soft"): Promise<void> {
    const headers: Record<string, string> = {};
    if (mode === "hard_delete") {
      headers["X-HippoDid-Confirm-Hard-Delete"] = "I understand this is irreversible";
    }
    await this.request<void>(
      "DELETE",
      `/v1/characters/${characterId}?mode=${mode}`,
      undefined,
      headers,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Memory ops
  // ═══════════════════════════════════════════════════════════════════════════

  async addMemory(characterId: string, options: AddMemoryOptions): Promise<Memory[]> {
    return this.post<Memory[]>(`/v1/characters/${characterId}/memories`, options);
  }

  async addMemoryDirect(characterId: string, options: AddMemoryDirectOptions): Promise<Memory> {
    return this.post<Memory>(`/v1/characters/${characterId}/memories/direct`, options);
  }

  async searchMemories(characterId: string, options: SearchMemoriesOptions): Promise<SearchResult[]> {
    const resp = await this.post<SearchMemoriesResponse>(
      `/v1/characters/${characterId}/memories/search`,
      {
        query: options.query,
        topK: options.topK,
        categories: options.categories,
      },
    );
    return resp.results;
  }

  async getMemories(characterId: string, options?: ListMemoriesOptions): Promise<MemoryListResponse> {
    const params = new URLSearchParams();
    if (options?.page != null) params.set("page", String(options.page));
    if (options?.limit != null) params.set("limit", String(options.limit));
    if (options?.category) params.set("category", options.category);
    if (options?.state) params.set("state", options.state);

    const qs = params.toString();
    return this.get<MemoryListResponse>(
      `/v1/characters/${characterId}/memories${qs ? `?${qs}` : ""}`,
    );
  }

  async getMemory(characterId: string, memoryId: string): Promise<Memory> {
    return this.get<Memory>(`/v1/characters/${characterId}/memories/${memoryId}`);
  }

  async updateMemory(
    characterId: string,
    memoryId: string,
    options: UpdateMemoryOptions,
  ): Promise<Memory> {
    return this.put<Memory>(
      `/v1/characters/${characterId}/memories/${memoryId}`,
      options,
    );
  }

  async deleteMemory(characterId: string, memoryId: string): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/v1/characters/${characterId}/memories/${memoryId}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Profile
  // ═══════════════════════════════════════════════════════════════════════════

  async getProfile(characterId: string): Promise<CharacterProfile | undefined> {
    const character = await this.getCharacter(characterId);
    return character.profile;
  }

  async updateProfile(characterId: string, options: UpdateProfileOptions): Promise<Character> {
    return this.patch<Character>(`/v1/characters/${characterId}/profile`, options);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Categories
  // ═══════════════════════════════════════════════════════════════════════════

  async listCategories(characterId: string): Promise<Category[]> {
    return this.get<Category[]>(`/v1/characters/${characterId}/categories`);
  }

  async addCategory(characterId: string, options: AddCategoryOptions): Promise<Category> {
    return this.post<Category>(`/v1/characters/${characterId}/categories`, options);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tags
  // ═══════════════════════════════════════════════════════════════════════════

  async listTags(characterId: string): Promise<string[]> {
    const resp = await this.get<TagResponse>(
      `/v1/characters/${characterId}/tags`,
    );
    return resp.tags;
  }

  async addTags(characterId: string, tags: string[]): Promise<string[]> {
    const resp = await this.post<TagResponse>(
      `/v1/characters/${characterId}/tags`,
      { tags },
    );
    return resp.tags;
  }

  async replaceTags(characterId: string, tags: string[]): Promise<string[]> {
    const resp = await this.put<TagResponse>(
      `/v1/characters/${characterId}/tags`,
      { tags },
    );
    return resp.tags;
  }

  async removeTag(characterId: string, tag: string): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/v1/characters/${characterId}/tags/${encodeURIComponent(tag)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Character Templates (Sprint 15)
  // ═══════════════════════════════════════════════════════════════════════════

  async createCharacterTemplate(options: CreateCharacterTemplateOptions): Promise<CharacterTemplate> {
    return this.post<CharacterTemplate>("/v1/templates/characters", options);
  }

  async listCharacterTemplates(): Promise<CharacterTemplate[]> {
    return this.get<CharacterTemplate[]>("/v1/templates/characters");
  }

  async getCharacterTemplate(templateId: string): Promise<CharacterTemplate> {
    return this.get<CharacterTemplate>(`/v1/templates/characters/${templateId}`);
  }

  async previewCharacterTemplate(
    templateId: string,
    sampleRow: Record<string, string>,
  ): Promise<Character> {
    return this.post<Character>(
      `/v1/templates/characters/${templateId}/preview`,
      { sampleRow },
    );
  }

  async cloneCharacterTemplate(templateId: string): Promise<CharacterTemplate> {
    return this.post<CharacterTemplate>(
      `/v1/templates/characters/${templateId}/clone`,
      {},
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Batch (Sprint 16)
  // ═══════════════════════════════════════════════════════════════════════════

  async batchCreateCharacters(options: BatchCreateOptions): Promise<BatchJob> {
    const raw = await this.requestMultipart<BatchJobApiResponse>(
      "/v1/characters/batch",
      options,
    );
    return normaliseBatchJob(raw);
  }

  async getBatchJobStatus(jobId: string): Promise<BatchJob> {
    const raw = await this.get<BatchJobApiResponse>(`/v1/jobs/${jobId}`);
    return normaliseBatchJob(raw);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Agent Config (Sprint 17)
  // ═══════════════════════════════════════════════════════════════════════════

  async getAgentConfig(characterId: string): Promise<AgentConfig> {
    return this.get<AgentConfig>(`/v1/characters/${characterId}/agent-config`);
  }

  async setAgentConfig(characterId: string, config: AgentConfig): Promise<AgentConfig> {
    return this.put<AgentConfig>(
      `/v1/characters/${characterId}/agent-config`,
      config,
    );
  }

  async deleteAgentConfig(characterId: string): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/v1/characters/${characterId}/agent-config`,
    );
  }

  async createAgentConfigTemplate(
    name: string,
    config: AgentConfig,
  ): Promise<AgentConfigTemplate> {
    return this.post<AgentConfigTemplate>("/v1/templates/agent-configs", {
      name,
      config,
    });
  }

  async listAgentConfigTemplates(): Promise<AgentConfigTemplate[]> {
    return this.get<AgentConfigTemplate[]>("/v1/templates/agent-configs");
  }

  async getAgentConfigTemplate(templateId: string): Promise<AgentConfigTemplate> {
    return this.get<AgentConfigTemplate>(`/v1/templates/agent-configs/${templateId}`);
  }

  async updateAgentConfigTemplate(
    templateId: string,
    name: string,
    config: AgentConfig,
  ): Promise<AgentConfigTemplate> {
    return this.put<AgentConfigTemplate>(
      `/v1/templates/agent-configs/${templateId}`,
      { name, config },
    );
  }

  async deleteAgentConfigTemplate(templateId: string): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/v1/templates/agent-configs/${templateId}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Clone (Sprint 17)
  // ═══════════════════════════════════════════════════════════════════════════

  async cloneCharacter(characterId: string, options: CloneCharacterOptions): Promise<CloneResult> {
    return this.post<CloneResult>(
      `/v1/characters/${characterId}/clone`,
      options,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Memory Mode (Sprint 17)
  // ═══════════════════════════════════════════════════════════════════════════

  async setMemoryMode(characterId: string, mode: MemoryMode): Promise<Character> {
    return this.updateCharacter(characterId, { memoryMode: mode });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Convenience: assembleContext
  // ═══════════════════════════════════════════════════════════════════════════

  async assembleContext(
    characterId: string,
    query: string,
    options?: AssembleContextOptions,
  ): Promise<AssembledContext> {
    const strategy = options?.strategy ?? "default";
    const includeProfile = options?.includeProfile ?? true;
    const includeConfig = options?.includeConfig ?? true;

    // Fetch memories, profile, and config in parallel
    const [memories, character] = await Promise.all([
      this.searchMemories(characterId, {
        query,
        topK: options?.topK ?? 10,
        categories: options?.categories,
      }),
      this.getCharacter(characterId),
    ]);

    const profile = includeProfile ? character.profile : undefined;
    const config = includeConfig ? character.agentConfig : undefined;

    return assembleFromParts(strategy, profile, memories, config);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HTTP internals
  // ═══════════════════════════════════════════════════════════════════════════

  private async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  /**
   * Send a batch-create request as multipart/form-data.
   * The backend expects: file (CSV), templateId, externalIdColumn, onConflict, dryRun.
   */
  private async requestMultipart<T>(
    path: string,
    options: BatchCreateOptions,
  ): Promise<T> {
    const csv = rowsToCsv(options.rows);
    const form = new FormData();
    form.append("file", new Blob([csv], { type: "text/csv" }), "batch.csv");
    form.append("templateId", options.templateId);
    form.append("externalIdColumn", options.externalIdColumn);
    form.append("onConflict", options.onConflict ?? "ERROR");
    form.append("dryRun", String(options.dryRun ?? false));

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
    if (this.tenantId) {
      headers["X-Tenant-Id"] = this.tenantId;
    }

    return this.executeWithRetry(
      () => fetch(url, { method: "POST", headers, body: form }),
    );
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      ...extraHeaders,
    };
    if (body != null) {
      headers["Content-Type"] = "application/json";
    }
    if (this.tenantId) {
      headers["X-Tenant-Id"] = this.tenantId;
    }

    return this.executeWithRetry(
      () =>
        fetch(url, {
          method,
          headers,
          body: body != null ? JSON.stringify(body) : undefined,
        }),
    );
  }

  /** Shared retry/backoff/error-dispatch loop used by request() and requestMultipart(). */
  private async executeWithRetry<T>(
    doFetch: () => Promise<Response>,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * backoff * 0.3;
        await sleep(backoff + jitter);
      }

      let response: Response;
      try {
        response = await doFetch();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      if (response.ok) {
        if (response.status === 204) return undefined as T;
        const text = await response.text();
        if (!text) return undefined as T;
        return JSON.parse(text) as T;
      }

      let errorMessage: string;
      try {
        const errBody = await response.json();
        errorMessage =
          errBody.message ?? errBody.error ?? JSON.stringify(errBody);
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }

      if (response.status === 429 || response.status >= 500) {
        if (response.status === 429 && attempt === this.maxRetries) {
          const retryAfter = response.headers.get("Retry-After");
          throw new RateLimitError(
            errorMessage,
            retryAfter ? parseInt(retryAfter, 10) * 1000 : 0,
          );
        }
        lastError = new HippoDidError(errorMessage, response.status);
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(errorMessage);
      }
      if (response.status === 404) {
        throw new NotFoundError(errorMessage);
      }
      if (response.status === 400 || response.status === 422) {
        throw new ValidationError(errorMessage, response.status);
      }
      throw new HippoDidError(errorMessage, response.status);
    }

    throw lastError ?? new HippoDidError("Request failed after retries");
  }
}

/** Normalise the backend's nested batch-job response into the flat SDK shape. */
function normaliseBatchJob(raw: BatchJobApiResponse): BatchJob {
  return {
    jobId: raw.jobId,
    status: raw.status,
    dryRun: raw.dryRun,
    totalRows: raw.progress?.totalRows ?? 0,
    succeeded: raw.progress?.succeeded ?? 0,
    failed: raw.progress?.failed ?? 0,
    skipped: raw.progress?.skipped ?? 0,
    errors: (raw.errors ?? []).map((e) => ({
      rowIndex: e.rowIndex,
      externalId: e.externalId,
      message: e.message,
    })),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    completedAt: raw.completedAt,
  };
}

/** Convert an array of row objects to a CSV string. */
function rowsToCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return "";
  const columns = [...new Set(rows.flatMap(Object.keys))];
  const escapeCsv = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const header = columns.map(escapeCsv).join(",");
  const dataRows = rows.map((row) =>
    columns.map((col) => escapeCsv(row[col] ?? "")).join(","),
  );
  return [header, ...dataRows].join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
