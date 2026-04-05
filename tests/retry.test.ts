import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { HippoDid } from "../src/client.js";
import { RateLimitError, HippoDidError } from "../src/errors.js";
import { MockServer } from "./mock-server.js";

describe("Retry with exponential backoff", () => {
  const server = new MockServer();
  let hd: HippoDid;

  beforeAll(async () => {
    const baseUrl = await server.start();
    // Use 0 retries for fast tests, override per-test
    hd = new HippoDid({ apiKey: "test-key", baseUrl, maxRetries: 2 });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("retries on 429 and succeeds on subsequent attempt", async () => {
    let callCount = 0;
    server.route({
      method: "GET",
      path: "/v1/characters",
      handler: () => {
        callCount++;
        if (callCount === 1) {
          return { status: 429, body: { message: "Rate limited" }, headers: { "Retry-After": "1" } };
        }
        return { status: 200, body: { characters: [], totalCount: 0, page: 0, limit: 20 } };
      },
    });

    const result = await hd.listCharacters();

    expect(result.characters).toHaveLength(0);
    expect(callCount).toBe(2);
  });

  it("retries on 500 and succeeds", async () => {
    let callCount = 0;
    server.route({
      method: "GET",
      path: "/v1/characters/c1-uuid",
      handler: () => {
        callCount++;
        if (callCount <= 2) {
          return { status: 500, body: { message: "Internal server error" } };
        }
        return {
          status: 200,
          body: {
            id: "c1-uuid", name: "Agent", visibility: "PRIVATE",
            memoryMode: "EXTRACTED", memoryCount: 0, aliases: [], tags: [],
            createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
          },
        };
      },
    });

    const result = await hd.getCharacter("c1-uuid");

    expect(result.id).toBe("c1-uuid");
    expect(callCount).toBe(3);
  });

  it("throws RateLimitError after exhausting retries on 429", async () => {
    server.route({
      method: "GET",
      path: "/v1/characters",
      status: 429,
      body: { message: "Rate limited" },
      headers: { "Retry-After": "60" },
    });

    // Use a client with 0 retries for this test
    const baseUrl = server.baseUrl;
    const noRetry = new HippoDid({ apiKey: "test-key", baseUrl, maxRetries: 0 });

    await expect(noRetry.listCharacters()).rejects.toThrow(RateLimitError);
  });

  it("throws HippoDidError after exhausting retries on 500", async () => {
    server.route({
      method: "GET",
      path: "/v1/characters/c1-uuid",
      status: 500,
      body: { message: "Server error" },
    });

    const baseUrl = server.baseUrl;
    const noRetry = new HippoDid({ apiKey: "test-key", baseUrl, maxRetries: 0 });

    await expect(noRetry.getCharacter("c1-uuid")).rejects.toThrow(HippoDidError);
  });

  it("does NOT retry on 400", async () => {
    let callCount = 0;
    server.route({
      method: "POST",
      path: "/v1/characters",
      handler: () => {
        callCount++;
        return { status: 400, body: { message: "Bad request" } };
      },
    });

    await expect(hd.createCharacter({ name: "" })).rejects.toThrow();
    expect(callCount).toBe(1); // No retry
  });

  it("does NOT retry on 404", async () => {
    let callCount = 0;
    server.route({
      method: "GET",
      path: "/v1/characters/missing",
      handler: () => {
        callCount++;
        return { status: 404, body: { message: "Not found" } };
      },
    });

    await expect(hd.getCharacter("missing")).rejects.toThrow();
    expect(callCount).toBe(1);
  });
});
