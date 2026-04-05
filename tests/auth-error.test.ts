import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { HippoDid } from "../src/client.js";
import { AuthenticationError, ValidationError } from "../src/errors.js";
import { MockServer } from "./mock-server.js";

describe("Authentication Errors", () => {
  const server = new MockServer();
  let hd: HippoDid;

  beforeAll(async () => {
    const baseUrl = await server.start();
    hd = new HippoDid({ apiKey: "bad-key", baseUrl });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("throws AuthenticationError on 401", async () => {
    server.route({
      method: "GET",
      path: "/v1/characters",
      status: 401,
      body: { message: "Invalid API key" },
    });

    await expect(hd.listCharacters()).rejects.toThrow(AuthenticationError);
    await expect(hd.listCharacters()).rejects.toThrow("Invalid API key");
  });

  it("throws AuthenticationError on 403", async () => {
    server.route({
      method: "GET",
      path: "/v1/characters/c1-uuid",
      status: 403,
      body: { message: "Access denied" },
    });

    await expect(hd.getCharacter("c1-uuid")).rejects.toThrow(AuthenticationError);
  });

  it("throws ValidationError on 400", async () => {
    server.route({
      method: "POST",
      path: "/v1/characters",
      status: 400,
      body: { message: "Name is required" },
    });

    await expect(
      hd.createCharacter({ name: "" }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError on 422 (bean validation)", async () => {
    server.route({
      method: "POST",
      path: "/v1/characters",
      status: 422,
      body: { message: "name: must not be blank" },
    });

    const err = await hd.createCharacter({ name: "" }).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.status).toBe(422);
    expect(err.message).toContain("must not be blank");
  });

  it("constructor throws if apiKey is empty", () => {
    expect(() => new HippoDid({ apiKey: "" })).toThrow(AuthenticationError);
  });

  it("sends Authorization header with Bearer token", async () => {
    const serverLocal = new MockServer();
    const baseUrl = await serverLocal.start();
    const client = new HippoDid({ apiKey: "my-secret-key", baseUrl });

    serverLocal.route({ method: "GET", path: "/v1/characters", body: { characters: [], totalCount: 0, page: 0, limit: 20 } });

    await client.listCharacters();

    expect(serverLocal.calls[0].headers["authorization"]).toBe("Bearer my-secret-key");

    await serverLocal.stop();
  });
});
