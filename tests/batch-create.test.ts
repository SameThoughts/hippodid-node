import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { HippoDid } from "../src/client.js";
import { MockServer } from "./mock-server.js";

/** Backend-shaped response with nested progress. */
const MOCK_JOB_API = {
  jobId: "job-uuid",
  type: "BATCH_CREATE",
  status: "ACCEPTED",
  dryRun: false,
  progress: {
    totalRows: 3,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  },
  errors: [],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("Batch Operations", () => {
  const server = new MockServer();
  let hd: HippoDid;

  beforeAll(async () => {
    const baseUrl = await server.start();
    hd = new HippoDid({ apiKey: "test-key", baseUrl });
  });

  afterAll(() => server.stop());
  beforeEach(() => server.reset());

  it("batchCreateCharacters sends multipart/form-data", async () => {
    server.route({ method: "POST", path: "/v1/characters/batch", status: 202, body: MOCK_JOB_API });

    const result = await hd.batchCreateCharacters({
      templateId: "t1-uuid",
      rows: [
        { name: "Alice", email: "alice@example.com" },
        { name: "Bob", email: "bob@example.com" },
        { name: "Carol", email: "carol@example.com" },
      ],
      externalIdColumn: "email",
      onConflict: "SKIP",
    });

    // Normalised flat shape
    expect(result.jobId).toBe("job-uuid");
    expect(result.status).toBe("ACCEPTED");
    expect(result.totalRows).toBe(3);
    expect(result.dryRun).toBe(false);

    // Verify multipart content-type was sent (not application/json)
    const contentType = server.calls[0].headers["content-type"] ?? "";
    expect(contentType).toContain("multipart/form-data");
  });

  it("batchCreateCharacters with dryRun", async () => {
    const dryRunJob = {
      ...MOCK_JOB_API,
      status: "COMPLETED",
      dryRun: true,
      progress: { ...MOCK_JOB_API.progress, succeeded: 1 },
      completedAt: "2025-01-01T00:01:00Z",
    };
    server.route({ method: "POST", path: "/v1/characters/batch", status: 202, body: dryRunJob });

    const result = await hd.batchCreateCharacters({
      templateId: "t1-uuid",
      rows: [{ name: "Test" }],
      externalIdColumn: "name",
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.status).toBe("COMPLETED");
    expect(result.completedAt).toBe("2025-01-01T00:01:00Z");
  });

  it("getBatchJobStatus normalises nested progress", async () => {
    const completed = {
      ...MOCK_JOB_API,
      status: "COMPLETED",
      progress: { totalRows: 3, succeeded: 2, failed: 1, skipped: 0 },
      errors: [{ rowIndex: 2, externalId: "bob@example.com", message: "Duplicate" }],
      completedAt: "2025-01-01T00:05:00Z",
    };
    server.route({ method: "GET", path: "/v1/jobs/job-uuid", body: completed });

    const result = await hd.getBatchJobStatus("job-uuid");

    expect(result.status).toBe("COMPLETED");
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rowIndex).toBe(2);
    expect(result.errors[0].message).toBe("Duplicate");
    expect(result.completedAt).toBe("2025-01-01T00:05:00Z");
  });
});
