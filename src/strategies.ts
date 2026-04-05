import type {
  AgentConfig,
  AssembledContext,
  AssemblyStrategy,
  CharacterProfile,
  SearchResult,
} from "./models.js";

/** Rough token estimate: ~4 chars per token for English text. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatMemories(memories: SearchResult[]): string {
  if (memories.length === 0) return "";
  return memories
    .map(
      (m, i) =>
        `[${i + 1}] (${m.category}, salience=${m.salience.toFixed(2)}) ${m.content}`,
    )
    .join("\n");
}

function formatProfile(profile: CharacterProfile): string {
  const parts: string[] = [];
  if (profile.personality) parts.push(`Personality: ${profile.personality}`);
  if (profile.background) parts.push(`Background: ${profile.background}`);
  const rules = profile.rules ?? [];
  if (rules.length > 0) {
    parts.push(`Rules:\n${rules.map((r) => `- ${r}`).join("\n")}`);
  }
  const customFields = profile.customFields ?? {};
  if (Object.keys(customFields).length > 0) {
    const fields = Object.entries(customFields)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");
    parts.push(`Custom Fields:\n${fields}`);
  }
  return parts.join("\n\n");
}

// ─── Strategy implementations ───────────────────────────────────────────────

function buildDefault(
  profile: CharacterProfile | undefined,
  memories: SearchResult[],
  config: AgentConfig | undefined,
): { systemPrompt: string; formattedPrompt: string } {
  const sections: string[] = [];

  if (config?.systemPrompt) {
    sections.push(config.systemPrompt);
  } else if (profile?.systemPrompt) {
    sections.push(profile.systemPrompt);
  }

  if (profile) {
    const profileText = formatProfile(profile);
    if (profileText) sections.push(`## Character Profile\n${profileText}`);
  }

  if (memories.length > 0) {
    sections.push(`## Relevant Memories\n${formatMemories(memories)}`);
  }

  const systemPrompt = sections[0] ?? "";
  const formattedPrompt = sections.join("\n\n");
  return { systemPrompt, formattedPrompt };
}

function buildConversational(
  profile: CharacterProfile | undefined,
  memories: SearchResult[],
  config: AgentConfig | undefined,
): { systemPrompt: string; formattedPrompt: string } {
  const sections: string[] = [];

  const basePrompt =
    config?.systemPrompt ?? profile?.systemPrompt ?? "You are a helpful assistant.";
  sections.push(basePrompt);

  if (profile?.personality) {
    sections.push(
      `Adopt this personality in conversation: ${profile.personality}`,
    );
  }

  if (memories.length > 0) {
    sections.push(
      `Here is what you remember about this user from previous conversations:\n${formatMemories(memories)}`,
    );
    sections.push(
      "Use these memories naturally in conversation — reference them when relevant, " +
        "but don't list them unprompted.",
    );
  }

  const systemPrompt = basePrompt;
  const formattedPrompt = sections.join("\n\n");
  return { systemPrompt, formattedPrompt };
}

function buildTaskFocused(
  profile: CharacterProfile | undefined,
  memories: SearchResult[],
  config: AgentConfig | undefined,
): { systemPrompt: string; formattedPrompt: string } {
  const sections: string[] = [];

  const basePrompt =
    config?.systemPrompt ??
    profile?.systemPrompt ??
    "You are a task-focused assistant. Be direct and efficient.";
  sections.push(basePrompt);

  if (profile?.rules && profile.rules.length > 0) {
    sections.push(
      `## Constraints\n${profile.rules.map((r) => `- ${r}`).join("\n")}`,
    );
  }

  if (memories.length > 0) {
    const highSalience = memories.filter((m) => m.salience >= 0.6);
    const relevant = highSalience.length > 0 ? highSalience : memories.slice(0, 5);
    sections.push(
      `## Key Context (high-priority facts)\n${formatMemories(relevant)}`,
    );
  }

  const systemPrompt = basePrompt;
  const formattedPrompt = sections.join("\n\n");
  return { systemPrompt, formattedPrompt };
}

function buildConcierge(
  profile: CharacterProfile | undefined,
  memories: SearchResult[],
  config: AgentConfig | undefined,
): { systemPrompt: string; formattedPrompt: string } {
  const sections: string[] = [];

  const basePrompt =
    config?.systemPrompt ??
    profile?.systemPrompt ??
    "You are a knowledgeable concierge. Anticipate needs and provide proactive assistance.";
  sections.push(basePrompt);

  if (profile) {
    const profileText = formatProfile(profile);
    if (profileText) sections.push(`## Who You Are\n${profileText}`);
  }

  if (memories.length > 0) {
    const grouped = new Map<string, SearchResult[]>();
    for (const m of memories) {
      const list = grouped.get(m.category) ?? [];
      list.push(m);
      grouped.set(m.category, list);
    }

    const parts: string[] = [];
    for (const [category, items] of grouped) {
      parts.push(
        `### ${category}\n${items.map((m) => `- ${m.content}`).join("\n")}`,
      );
    }
    sections.push(`## What You Know\n${parts.join("\n\n")}`);
  }

  sections.push(
    "Proactively surface relevant information from your knowledge base. " +
      "If you notice connections between what the user is asking and what you know, mention them.",
  );

  const systemPrompt = basePrompt;
  const formattedPrompt = sections.join("\n\n");
  return { systemPrompt, formattedPrompt };
}

function buildMatching(
  profile: CharacterProfile | undefined,
  memories: SearchResult[],
  config: AgentConfig | undefined,
): { systemPrompt: string; formattedPrompt: string } {
  const sections: string[] = [];

  const basePrompt =
    config?.systemPrompt ?? profile?.systemPrompt ?? "You are a helpful assistant.";
  sections.push(basePrompt);

  if (memories.length > 0) {
    sections.push(
      `The following memories matched the user's query (ranked by relevance):\n${formatMemories(memories)}`,
    );
    sections.push(
      "Ground your response in these memories. Cite memory numbers [N] when using specific facts.",
    );
  }

  const systemPrompt = basePrompt;
  const formattedPrompt = sections.join("\n\n");
  return { systemPrompt, formattedPrompt };
}

// ─── Public ─────────────────────────────────────────────────────────────────

const strategyBuilders: Record<
  AssemblyStrategy,
  (
    profile: CharacterProfile | undefined,
    memories: SearchResult[],
    config: AgentConfig | undefined,
  ) => { systemPrompt: string; formattedPrompt: string }
> = {
  default: buildDefault,
  conversational: buildConversational,
  task_focused: buildTaskFocused,
  concierge: buildConcierge,
  matching: buildMatching,
};

export function assembleFromParts(
  strategy: AssemblyStrategy,
  profile: CharacterProfile | undefined,
  memories: SearchResult[],
  config: AgentConfig | undefined,
): AssembledContext {
  const builder = strategyBuilders[strategy];
  const { systemPrompt, formattedPrompt } = builder(profile, memories, config);

  return {
    systemPrompt,
    profile,
    memories,
    config,
    formattedPrompt,
    tokenEstimate: estimateTokens(formattedPrompt),
    strategy,
  };
}
