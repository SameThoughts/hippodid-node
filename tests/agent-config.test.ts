import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { HippoDid } from "../src/client.js";
import { MockServer } from "./mock-server.js";

const MOCK_CONFIG = {
  systemPrompt: "You are a support agent.",
  preferredModel: "claude-sonnet-4-20250514",
  temperature: 0.5,
  maxTokens: 2048,
  tools: ["search_memories"],
  responseFormat: "TEXT",
};

describe("Agent Config", () => {
  const server = new MockServer();
  let hd: HippoDid;

  beforeAll(async () => {
    const baseUrl = await server.start();
    hd = new HippoDid({ apiKey: "test-key", baseUrl });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("getAgentConfig sends GET", async () => {
    server.route({ method: "GET", path: "/v1/characters/c1-uuid/agent-config", body: MOCK_CONFIG });

    const result = await hd.getAgentConfig("c1-uuid");

    expect(result.systemPrompt).toBe("You are a support agent.");
    expect(result.temperature).toBe(0.5);
  });

  it("setAgentConfig sends PUT", async () => {
    server.route({ method: "PUT", path: "/v1/characters/c1-uuid/agent-config", body: MOCK_CONFIG });

    const result = await hd.setAgentConfig("c1-uuid", {
      systemPrompt: "You are a support agent.",
      preferredModel: "claude-sonnet-4-20250514",
      temperature: 0.5,
    });

    expect(result.preferredModel).toBe("claude-sonnet-4-20250514");
  });

  it("deleteAgentConfig sends DELETE", async () => {
    server.route({ method: "DELETE", path: "/v1/characters/c1-uuid/agent-config", status: 204 });

    await hd.deleteAgentConfig("c1-uuid");

    expect(server.calls[0].method).toBe("DELETE");
  });

  it("createAgentConfigTemplate sends POST", async () => {
    const template = {
      id: "act-uuid",
      name: "Support Bot",
      config: MOCK_CONFIG,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };
    server.route({ method: "POST", path: "/v1/templates/agent-configs", status: 201, body: template });

    const result = await hd.createAgentConfigTemplate("Support Bot", MOCK_CONFIG);

    expect(result.id).toBe("act-uuid");
    expect(result.name).toBe("Support Bot");
  });

  it("listAgentConfigTemplates sends GET", async () => {
    const template = {
      id: "act-uuid",
      name: "Support Bot",
      config: MOCK_CONFIG,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };
    server.route({ method: "GET", path: "/v1/templates/agent-configs", body: [template] });

    const result = await hd.listAgentConfigTemplates();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Support Bot");
  });

  it("getAgentConfigTemplate sends GET by id", async () => {
    const template = {
      id: "act-uuid",
      name: "Support Bot",
      config: MOCK_CONFIG,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };
    server.route({ method: "GET", path: "/v1/templates/agent-configs/act-uuid", body: template });

    const result = await hd.getAgentConfigTemplate("act-uuid");

    expect(result.id).toBe("act-uuid");
    expect(result.config.systemPrompt).toBe("You are a support agent.");
  });

  it("updateAgentConfigTemplate sends PUT", async () => {
    const updated = {
      id: "act-uuid",
      name: "Renamed Bot",
      config: { ...MOCK_CONFIG, temperature: 0.9 },
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-02T00:00:00Z",
    };
    server.route({ method: "PUT", path: "/v1/templates/agent-configs/act-uuid", body: updated });

    const result = await hd.updateAgentConfigTemplate(
      "act-uuid",
      "Renamed Bot",
      { ...MOCK_CONFIG, temperature: 0.9 },
    );

    expect(result.name).toBe("Renamed Bot");
    expect(result.config.temperature).toBe(0.9);
  });

  it("deleteAgentConfigTemplate sends DELETE", async () => {
    server.route({ method: "DELETE", path: "/v1/templates/agent-configs/act-uuid", status: 204 });

    await hd.deleteAgentConfigTemplate("act-uuid");

    expect(server.calls[0].method).toBe("DELETE");
    expect(server.calls[0].path).toBe("/v1/templates/agent-configs/act-uuid");
  });
});
