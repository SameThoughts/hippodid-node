import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { HippoDid } from "../src/client.js";
import { MockServer } from "./mock-server.js";

const MOCK_TEMPLATE = {
  id: "t1-uuid",
  name: "Customer Profile",
  description: "Template for customer characters",
  categories: [{ categoryName: "preferences", purpose: "User preferences" }],
  defaultValues: { language: "en" },
  fieldMappings: [{ sourceColumn: "name", targetField: "name" }],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("Character Template CRUD", () => {
  const server = new MockServer();
  let hd: HippoDid;

  beforeAll(async () => {
    const baseUrl = await server.start();
    hd = new HippoDid({ apiKey: "test-key", baseUrl });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("createCharacterTemplate sends POST", async () => {
    server.route({ method: "POST", path: "/v1/templates/characters", status: 201, body: MOCK_TEMPLATE });

    const result = await hd.createCharacterTemplate({
      name: "Customer Profile",
      description: "Template for customer characters",
      categories: [{ categoryName: "preferences", purpose: "User preferences" }],
    });

    expect(result.id).toBe("t1-uuid");
    expect(result.name).toBe("Customer Profile");
  });

  it("listCharacterTemplates sends GET", async () => {
    server.route({ method: "GET", path: "/v1/templates/characters", body: [MOCK_TEMPLATE] });

    const result = await hd.listCharacterTemplates();

    expect(result).toHaveLength(1);
  });

  it("getCharacterTemplate sends GET with ID", async () => {
    server.route({ method: "GET", path: "/v1/templates/characters/t1-uuid", body: MOCK_TEMPLATE });

    const result = await hd.getCharacterTemplate("t1-uuid");

    expect(result.id).toBe("t1-uuid");
  });

  it("previewCharacterTemplate sends POST with sample row", async () => {
    server.route({
      method: "POST",
      path: "/v1/templates/characters/t1-uuid/preview",
      body: { id: "preview-uuid", name: "John Doe", visibility: "PRIVATE", memoryMode: "EXTRACTED", memoryCount: 0, aliases: [], tags: [], createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
    });

    const result = await hd.previewCharacterTemplate("t1-uuid", { name: "John Doe" });

    expect(result.name).toBe("John Doe");
  });

  it("cloneCharacterTemplate sends POST", async () => {
    const cloned = { ...MOCK_TEMPLATE, id: "t2-uuid", name: "Customer Profile (copy)" };
    server.route({ method: "POST", path: "/v1/templates/characters/t1-uuid/clone", status: 201, body: cloned });

    const result = await hd.cloneCharacterTemplate("t1-uuid");

    expect(result.id).toBe("t2-uuid");
    expect(result.name).toContain("copy");
  });
});
