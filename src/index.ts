export { HippoDid } from "./client.js";
export type { HippoDidOptions } from "./client.js";

export {
  HippoDidError,
  NotFoundError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from "./errors.js";

export type {
  Character,
  CharacterAlias,
  CharacterProfile,
  CharacterListResponse,
  CreateCharacterOptions,
  UpdateCharacterOptions,
  ListCharactersOptions,
  Memory,
  MemoryMode,
  MemoryListResponse,
  SearchResult,
  SearchMemoriesResponse,
  SearchMemoriesOptions,
  AddMemoryOptions,
  AddMemoryDirectOptions,
  ListMemoriesOptions,
  UpdateMemoryOptions,
  Category,
  AddCategoryOptions,
  TagResponse,
  AgentConfig,
  AgentConfigTemplate,
  CharacterTemplate,
  CategoryDefinition,
  FieldMapping,
  CreateCharacterTemplateOptions,
  BatchJob,
  BatchRowError,
  BatchCreateOptions,
  CloneResult,
  CloneCharacterOptions,
  UpdateProfileOptions,
  AssemblyStrategy,
  AssembleContextOptions,
  AssembledContext,
} from "./models.js";

export { assembleFromParts } from "./strategies.js";
