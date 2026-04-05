import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { HippoDid } from "../src/client.js";
import { MockServer } from "./mock-server.js";

const MOCK_MEMORY = {
  id: "m1-uuid",
  characterId: "c1-uuid",
  content: "User prefers dark mode",
  category: "preferences",
  salience: 0.8,
  visibility: "PRIVATE",
  state: "ACTIVE",
  sourceType: "manual",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const MOCK_SEARCH_RESULT = {
  id: "m1-uuid",
  content: "User prefers dark mode",
  category: "preferences",
  salience: 0.8,
  score: 0.95,
  createdAt: "2025-01-01T00:00:00Z",
};

describe("Memory Operations", () => {
  const server = new MockServer();
  let hd: HippoDid;

  beforeAll(async () => {
    const baseUrl = await server.start();
    hd = new HippoDid({ apiKey: "test-key", baseUrl });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("addMemory sends content and returns memories", async () => {
    server.route({
      method: "POST",
      path: "/v1/characters/c1-uuid/memories",
      status: 201,
      body: [MOCK_MEMORY],
    });

    const result = await hd.addMemory("c1-uuid", { content: "User prefers dark mode" });

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("User prefers dark mode");
  });

  it("addMemoryDirect sends direct write", async () => {
    server.route({
      method: "POST",
      path: "/v1/characters/c1-uuid/memories/direct",
      status: 201,
      body: MOCK_MEMORY,
    });

    const result = await hd.addMemoryDirect("c1-uuid", {
      content: "User prefers dark mode",
      category: "preferences",
      salience: 0.8,
    });

    expect(result.category).toBe("preferences");
  });

  it("searchMemories sends query and returns results", async () => {
    server.route({
      method: "POST",
      path: "/v1/characters/c1-uuid/memories/search",
      body: { results: [MOCK_SEARCH_RESULT] },
    });

    const results = await hd.searchMemories("c1-uuid", { query: "dark mode", topK: 5 });

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.95);
    const reqBody = JSON.parse(server.calls[0].body);
    expect(reqBody.query).toBe("dark mode");
    expect(reqBody.topK).toBe(5);
  });

  it("searchMemories with category filter", async () => {
    server.route({
      method: "POST",
      path: "/v1/characters/c1-uuid/memories/search",
      body: { results: [MOCK_SEARCH_RESULT] },
    });

    await hd.searchMemories("c1-uuid", {
      query: "preferences",
      categories: ["preferences", "settings"],
    });

    const reqBody = JSON.parse(server.calls[0].body);
    expect(reqBody.categories).toEqual(["preferences", "settings"]);
  });

  it("getMemories lists with pagination", async () => {
    server.route({
      method: "GET",
      path: "/v1/characters/c1-uuid/memories",
      body: { memories: [MOCK_MEMORY], totalCount: 1, page: 0, limit: 20 },
    });

    const result = await hd.getMemories("c1-uuid", { page: 0, limit: 20 });

    expect(result.memories).toHaveLength(1);
  });

  it("deleteMemory sends DELETE", async () => {
    server.route({
      method: "DELETE",
      path: "/v1/characters/c1-uuid/memories/m1-uuid",
      status: 204,
    });

    await hd.deleteMemory("c1-uuid", "m1-uuid");

    expect(server.calls[0].method).toBe("DELETE");
  });

  it("updateMemory sends PUT", async () => {
    const updated = { ...MOCK_MEMORY, content: "Updated preference" };
    server.route({
      method: "PUT",
      path: "/v1/characters/c1-uuid/memories/m1-uuid",
      body: updated,
    });

    const result = await hd.updateMemory("c1-uuid", "m1-uuid", {
      content: "Updated preference",
      salience: 0.9,
    });

    expect(result.content).toBe("Updated preference");
  });
});
