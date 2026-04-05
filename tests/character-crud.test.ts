import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { HippoDid } from "../src/client.js";
import { NotFoundError } from "../src/errors.js";
import { MockServer } from "./mock-server.js";

const MOCK_CHARACTER = {
  id: "c1-uuid",
  name: "Test Agent",
  description: "A test character",
  visibility: "PRIVATE",
  memoryMode: "EXTRACTED",
  memoryCount: 5,
  profile: { systemPrompt: "You are helpful.", personality: null, background: null, rules: [], customFields: {} },
  agentConfig: null,
  aliases: [],
  tags: ["test"],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("Character CRUD", () => {
  const server = new MockServer();
  let hd: HippoDid;

  beforeAll(async () => {
    const baseUrl = await server.start();
    hd = new HippoDid({ apiKey: "test-key", baseUrl });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("createCharacter sends POST and returns character", async () => {
    server.route({ method: "POST", path: "/v1/characters", status: 201, body: MOCK_CHARACTER });

    const result = await hd.createCharacter({ name: "Test Agent", description: "A test character" });

    expect(result.id).toBe("c1-uuid");
    expect(result.name).toBe("Test Agent");
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0].method).toBe("POST");
    const reqBody = JSON.parse(server.calls[0].body);
    expect(reqBody.name).toBe("Test Agent");
  });

  it("getCharacter sends GET with character ID", async () => {
    server.route({ method: "GET", path: "/v1/characters/c1-uuid", body: MOCK_CHARACTER });

    const result = await hd.getCharacter("c1-uuid");

    expect(result.id).toBe("c1-uuid");
    expect(server.calls[0].method).toBe("GET");
  });

  it("getCharacterByExternalId resolves external ID", async () => {
    server.route({ method: "GET", path: "/v1/characters/external/ext-123", body: MOCK_CHARACTER });

    const result = await hd.getCharacterByExternalId("ext-123");

    expect(result.id).toBe("c1-uuid");
  });

  it("listCharacters sends GET with query params", async () => {
    server.route({
      method: "GET",
      path: "/v1/characters",
      body: { characters: [MOCK_CHARACTER], totalCount: 1, page: 0, limit: 20 },
    });

    const result = await hd.listCharacters({ page: 0, limit: 20, tag: "test" });

    expect(result.characters).toHaveLength(1);
    expect(server.calls[0].path).toContain("tag=test");
  });

  it("updateCharacter sends PUT", async () => {
    const updated = { ...MOCK_CHARACTER, name: "Updated Agent" };
    server.route({ method: "PUT", path: "/v1/characters/c1-uuid", body: updated });

    const result = await hd.updateCharacter("c1-uuid", { name: "Updated Agent" });

    expect(result.name).toBe("Updated Agent");
  });

  it("deleteCharacter sends DELETE with soft mode", async () => {
    server.route({ method: "DELETE", path: "/v1/characters/c1-uuid", status: 204 });

    await hd.deleteCharacter("c1-uuid");

    expect(server.calls[0].path).toContain("mode=soft");
  });

  it("deleteCharacter hard sends confirm header", async () => {
    server.route({
      method: "DELETE",
      path: "/v1/characters/c1-uuid",
      status: 200,
      body: { certificateId: "cert-1" },
    });

    await hd.deleteCharacter("c1-uuid", "hard_delete");

    expect(server.calls[0].headers["x-hippodid-confirm-hard-delete"]).toBe(
      "I understand this is irreversible",
    );
  });

  it("getCharacter throws NotFoundError on 404", async () => {
    server.route({
      method: "GET",
      path: "/v1/characters/missing",
      status: 404,
      body: { message: "Character not found" },
    });

    await expect(hd.getCharacter("missing")).rejects.toThrow(NotFoundError);
  });
});
