# @hippodid/sdk

Official TypeScript SDK for the [HippoDid](https://hippodid.com) AI character memory API.

Give your AI agents persistent, structured memory that works across sessions, devices, and frameworks.

## Install

```bash
npm install @hippodid/sdk
```

## Quick Start

```typescript
import { HippoDid } from "@hippodid/sdk";

const hd = new HippoDid({
  apiKey: process.env.HIPPODID_API_KEY!,
});

// Create a memory namespace for your agent
const character = await hd.createCharacter({
  name: "My Support Bot",
  description: "Customer support agent with memory",
});

// Store a memory
await hd.addMemory(character.id, {
  content: "Customer prefers email communication and uses the Pro plan.",
});

// Search memories
const results = await hd.searchMemories(character.id, {
  query: "What plan is the customer on?",
  topK: 5,
});
// → [{ content: "Customer prefers email communication and uses the Pro plan.", score: 0.94, ... }]
```

## `assembleContext()` — Memory-Augmented Prompts

The killer feature: assemble a complete LLM prompt with character profile, relevant memories, and agent config — in one call.

```typescript
const ctx = await hd.assembleContext(character.id, "Help me with billing", {
  strategy: "conversational", // or: default, task_focused, concierge, matching
  topK: 15,
});

// Use with any LLM SDK
const response = await llm.chat({
  system: ctx.formattedPrompt,  // Profile + memories + instructions, formatted
  messages: [{ role: "user", content: "Help me with billing" }],
});

console.log(ctx.tokenEstimate); // ~1200
console.log(ctx.memories.length); // 12
```

### Assembly Strategies

| Strategy | Best For | Behavior |
|----------|----------|----------|
| `default` | General use | Profile + memories in structured sections |
| `conversational` | Chat bots | Memories woven as "what you remember" |
| `task_focused` | Agents/tools | High-salience facts only, rules as constraints |
| `concierge` | Knowledge bases | Memories grouped by category, proactive surfacing |
| `matching` | RAG/citation | Ranked memories with `[N]` citation markers |

## Vercel AI SDK Integration

```typescript
import { HippoDid } from "@hippodid/sdk";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

const hd = new HippoDid({ apiKey: process.env.HIPPODID_API_KEY! });

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1].content;

  // Assemble memory-augmented system prompt
  const ctx = await hd.assembleContext("character-id", lastMessage, {
    strategy: "conversational",
    topK: 15,
  });

  // Stream with Vercel AI SDK
  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: ctx.formattedPrompt,
    messages,
  });

  // Store conversation as memory (fire-and-forget)
  hd.addMemory("character-id", { content: lastMessage }).catch(console.error);

  return result.toDataStreamResponse();
}
```

## Full API Reference

### Characters

```typescript
hd.createCharacter({ name, description?, visibility? })
hd.getCharacter(characterId)
hd.getCharacterByExternalId(externalId)
hd.listCharacters({ page?, limit?, tag?, sortBy?, sortOrder? })
hd.updateCharacter(characterId, { name?, description?, memoryMode? })
hd.deleteCharacter(characterId, mode?)  // "soft" (default) or "hard_delete"
hd.cloneCharacter(characterId, { name, copyMemories?, copyTags?, externalId? })
hd.setMemoryMode(characterId, "EXTRACTED" | "VERBATIM" | "HYBRID")
```

### Memories

```typescript
hd.addMemory(characterId, { content, sourceType? })
hd.addMemoryDirect(characterId, { content, category, salience?, visibility? })
hd.searchMemories(characterId, { query, topK?, categories? })
hd.getMemories(characterId, { page?, limit?, category?, state? })
hd.getMemory(characterId, memoryId)
hd.updateMemory(characterId, memoryId, { content, salience? })
hd.deleteMemory(characterId, memoryId)
```

### Profile & Categories

```typescript
hd.getProfile(characterId)
hd.updateProfile(characterId, { systemPrompt?, personality?, background?, rules?, customFields? })
hd.listCategories(characterId)
hd.addCategory(characterId, { name, description?, importance?, halfLifeDays? })
```

### Tags

```typescript
hd.listTags(characterId)
hd.addTags(characterId, ["tag1", "tag2"])
hd.replaceTags(characterId, ["tag1", "tag2"])
hd.removeTag(characterId, "tag1")
```

### Agent Config

```typescript
hd.getAgentConfig(characterId)
hd.setAgentConfig(characterId, { systemPrompt?, preferredModel?, temperature?, maxTokens?, tools?, responseFormat? })
hd.deleteAgentConfig(characterId)
hd.createAgentConfigTemplate(name, config)
hd.listAgentConfigTemplates()
```

### Character Templates & Batch

```typescript
hd.createCharacterTemplate({ name, description?, categories?, fieldMappings? })
hd.listCharacterTemplates()
hd.getCharacterTemplate(templateId)
hd.previewCharacterTemplate(templateId, sampleRow)
hd.cloneCharacterTemplate(templateId)
hd.batchCreateCharacters({ templateId, rows, externalIdColumn, onConflict?, dryRun? })
hd.getBatchJobStatus(jobId)
```

### Context Assembly

```typescript
hd.assembleContext(characterId, query, {
  strategy?,    // "default" | "conversational" | "task_focused" | "concierge" | "matching"
  topK?,        // Max memories to retrieve (default: 10)
  categories?,  // Filter by category
  includeProfile?,  // Include character profile (default: true)
  includeConfig?,   // Include agent config (default: true)
})
// Returns: { systemPrompt, profile?, memories, config?, formattedPrompt, tokenEstimate, strategy }
```

## Error Handling

```typescript
import { HippoDidError, NotFoundError, AuthenticationError, RateLimitError } from "@hippodid/sdk";

try {
  await hd.getCharacter("missing-id");
} catch (err) {
  if (err instanceof NotFoundError) { /* 404 */ }
  if (err instanceof AuthenticationError) { /* 401/403 */ }
  if (err instanceof RateLimitError) { /* 429, check err.retryAfterMs */ }
}
```

The SDK automatically retries on 429 and 5xx errors with exponential backoff (configurable via `maxRetries`).

## Configuration

```typescript
const hd = new HippoDid({
  apiKey: "hd_...",                          // Required
  baseUrl: "https://api.hippodid.com",       // Default
  tenantId: "tenant-uuid",                   // Optional, for multi-tenant
  maxRetries: 3,                             // Default: 3 retries for 429/5xx
});
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- ESM and CommonJS supported

## License

Apache-2.0
