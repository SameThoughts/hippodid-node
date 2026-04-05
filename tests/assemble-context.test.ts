import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { HippoDid } from "../src/client.js";
import { assembleFromParts } from "../src/strategies.js";
import { MockServer } from "./mock-server.js";
import type { CharacterProfile, SearchResult, AgentConfig } from "../src/models.js";

const MOCK_PROFILE: CharacterProfile = {
  systemPrompt: "You are a coding assistant.",
  personality: "Precise and concise",
  background: "Expert in TypeScript",
  rules: ["Always use TypeScript", "Prefer functional style"],
  customFields: { lang: "en" },
};

const MOCK_MEMORIES: SearchResult[] = [
  { id: "m1", content: "User prefers Vitest over Jest", category: "preferences", salience: 0.9, score: 0.95, createdAt: "2025-01-01T00:00:00Z" },
  { id: "m2", content: "Working on HippoDid SDK", category: "projects", salience: 0.7, score: 0.80, createdAt: "2025-01-01T00:00:00Z" },
  { id: "m3", content: "Likes dark mode", category: "preferences", salience: 0.4, score: 0.60, createdAt: "2025-01-01T00:00:00Z" },
];

const MOCK_CONFIG: AgentConfig = {
  systemPrompt: "You are an advanced coding assistant with memory.",
  preferredModel: "claude-sonnet-4-20250514",
  temperature: 0.3,
};

describe("assembleFromParts (unit)", () => {
  it("default strategy includes profile and memories", () => {
    const ctx = assembleFromParts("default", MOCK_PROFILE, MOCK_MEMORIES, MOCK_CONFIG);

    expect(ctx.strategy).toBe("default");
    expect(ctx.systemPrompt).toContain("advanced coding assistant");
    expect(ctx.formattedPrompt).toContain("Relevant Memories");
    expect(ctx.formattedPrompt).toContain("Character Profile");
    expect(ctx.memories).toHaveLength(3);
    expect(ctx.tokenEstimate).toBeGreaterThan(0);
  });

  it("conversational strategy references memories naturally", () => {
    const ctx = assembleFromParts("conversational", MOCK_PROFILE, MOCK_MEMORIES, undefined);

    expect(ctx.strategy).toBe("conversational");
    expect(ctx.formattedPrompt).toContain("previous conversations");
    expect(ctx.formattedPrompt).toContain("naturally in conversation");
    expect(ctx.formattedPrompt).toContain("Precise and concise");
  });

  it("task_focused strategy filters high-salience memories", () => {
    const ctx = assembleFromParts("task_focused", MOCK_PROFILE, MOCK_MEMORIES, undefined);

    expect(ctx.strategy).toBe("task_focused");
    expect(ctx.formattedPrompt).toContain("Constraints");
    expect(ctx.formattedPrompt).toContain("Key Context");
    // Should include high-salience memories but the low-salience one may be excluded
    expect(ctx.formattedPrompt).toContain("Vitest over Jest");
  });

  it("concierge strategy groups by category", () => {
    const ctx = assembleFromParts("concierge", MOCK_PROFILE, MOCK_MEMORIES, undefined);

    expect(ctx.strategy).toBe("concierge");
    expect(ctx.formattedPrompt).toContain("Who You Are");
    expect(ctx.formattedPrompt).toContain("What You Know");
    expect(ctx.formattedPrompt).toContain("### preferences");
    expect(ctx.formattedPrompt).toContain("### projects");
    expect(ctx.formattedPrompt).toContain("Proactively surface");
  });

  it("matching strategy cites memory numbers", () => {
    const ctx = assembleFromParts("matching", MOCK_PROFILE, MOCK_MEMORIES, undefined);

    expect(ctx.strategy).toBe("matching");
    expect(ctx.formattedPrompt).toContain("[1]");
    expect(ctx.formattedPrompt).toContain("[2]");
    expect(ctx.formattedPrompt).toContain("Cite memory numbers");
  });

  it("handles empty memories gracefully", () => {
    const ctx = assembleFromParts("default", MOCK_PROFILE, [], undefined);

    expect(ctx.memories).toHaveLength(0);
    expect(ctx.formattedPrompt).not.toContain("Relevant Memories");
  });

  it("handles undefined profile and config", () => {
    const ctx = assembleFromParts("default", undefined, MOCK_MEMORIES, undefined);

    expect(ctx.profile).toBeUndefined();
    expect(ctx.config).toBeUndefined();
    expect(ctx.formattedPrompt).toContain("Relevant Memories");
  });
});

describe("assembleContext (integration with mock)", () => {
  const server = new MockServer();
  let hd: HippoDid;

  const MOCK_CHARACTER = {
    id: "c1-uuid",
    name: "Test",
    visibility: "PRIVATE",
    memoryMode: "EXTRACTED",
    memoryCount: 3,
    profile: MOCK_PROFILE,
    agentConfig: MOCK_CONFIG,
    aliases: [],
    tags: [],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };

  beforeAll(async () => {
    const baseUrl = await server.start();
    hd = new HippoDid({ apiKey: "test-key", baseUrl });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("assembleContext fetches data and assembles", async () => {
    server.route({ method: "GET", path: "/v1/characters/c1-uuid", body: MOCK_CHARACTER });
    server.route({
      method: "POST",
      path: "/v1/characters/c1-uuid/memories/search",
      body: { results: MOCK_MEMORIES },
    });

    const ctx = await hd.assembleContext("c1-uuid", "TypeScript help");

    expect(ctx.strategy).toBe("default");
    expect(ctx.memories).toHaveLength(3);
    expect(ctx.profile).toBeDefined();
    expect(ctx.config).toBeDefined();
    expect(ctx.tokenEstimate).toBeGreaterThan(0);
  });

  it("assembleContext with custom strategy", async () => {
    server.route({ method: "GET", path: "/v1/characters/c1-uuid", body: MOCK_CHARACTER });
    server.route({
      method: "POST",
      path: "/v1/characters/c1-uuid/memories/search",
      body: { results: MOCK_MEMORIES },
    });

    const ctx = await hd.assembleContext("c1-uuid", "help", { strategy: "matching" });

    expect(ctx.strategy).toBe("matching");
    expect(ctx.formattedPrompt).toContain("Cite memory numbers");
  });
});
