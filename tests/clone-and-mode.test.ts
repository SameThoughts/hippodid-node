import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { HippoDid } from "../src/client.js";
import { MockServer } from "./mock-server.js";

describe("Clone Character", () => {
  const server = new MockServer();
  let hd: HippoDid;

  beforeAll(async () => {
    const baseUrl = await server.start();
    hd = new HippoDid({ apiKey: "test-key", baseUrl });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("cloneCharacter sends POST with options", async () => {
    const cloneResult = {
      sourceCharacterId: "c1-uuid",
      clonedCharacterId: "c2-uuid",
      clonedCharacter: {
        id: "c2-uuid",
        name: "Clone of Agent",
        visibility: "PRIVATE",
        memoryMode: "EXTRACTED",
        memoryCount: 0,
        aliases: [],
        tags: ["cloned"],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      memoriesCopied: 5,
    };
    server.route({ method: "POST", path: "/v1/characters/c1-uuid/clone", status: 201, body: cloneResult });

    const result = await hd.cloneCharacter("c1-uuid", {
      name: "Clone of Agent",
      copyMemories: true,
      copyTags: true,
    });

    expect(result.clonedCharacterId).toBe("c2-uuid");
    expect(result.memoriesCopied).toBe(5);

    const reqBody = JSON.parse(server.calls[0].body);
    expect(reqBody.name).toBe("Clone of Agent");
    expect(reqBody.copyMemories).toBe(true);
  });

  it("cloneCharacter with externalId and agent config override", async () => {
    const cloneResult = {
      sourceCharacterId: "c1-uuid",
      clonedCharacterId: "c3-uuid",
      clonedCharacter: { id: "c3-uuid", name: "Fork", visibility: "PRIVATE", memoryMode: "EXTRACTED", memoryCount: 0, aliases: [], tags: [], createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
      memoriesCopied: 0,
    };
    server.route({ method: "POST", path: "/v1/characters/c1-uuid/clone", status: 201, body: cloneResult });

    const result = await hd.cloneCharacter("c1-uuid", {
      name: "Fork",
      externalId: "ext-fork-1",
      agentConfigOverride: { temperature: 0.9, preferredModel: "gpt-4o" },
    });

    expect(result.clonedCharacterId).toBe("c3-uuid");
    const reqBody = JSON.parse(server.calls[0].body);
    expect(reqBody.externalId).toBe("ext-fork-1");
    expect(reqBody.agentConfigOverride.temperature).toBe(0.9);
  });
});

describe("Memory Mode", () => {
  const server = new MockServer();
  let hd: HippoDid;

  beforeAll(async () => {
    const baseUrl = await server.start();
    hd = new HippoDid({ apiKey: "test-key", baseUrl });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("setMemoryMode sends PUT with memoryMode", async () => {
    server.route({
      method: "PUT",
      path: "/v1/characters/c1-uuid",
      body: { id: "c1-uuid", name: "Agent", memoryMode: "VERBATIM", visibility: "PRIVATE", memoryCount: 0, aliases: [], tags: [], createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
    });

    const result = await hd.setMemoryMode("c1-uuid", "VERBATIM");

    expect(result.memoryMode).toBe("VERBATIM");
    const reqBody = JSON.parse(server.calls[0].body);
    expect(reqBody.memoryMode).toBe("VERBATIM");
  });
});
