import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface MockRoute {
  method: string;
  path: string | RegExp;
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  handler?: (req: IncomingMessage, body: string) => { status: number; body: unknown; headers?: Record<string, string> };
}

export class MockServer {
  private server: ReturnType<typeof createServer>;
  private routes: MockRoute[] = [];
  readonly calls: { method: string; path: string; body: string; headers: Record<string, string> }[] = [];
  baseUrl = "";

  constructor() {
    this.server = createServer((req, res) => this.handle(req, res));
  }

  route(route: MockRoute): this {
    this.routes.push(route);
    return this;
  }

  async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server.listen(0, "127.0.0.1", () => {
        const addr = this.server.address() as AddressInfo;
        this.baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve(this.baseUrl);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  reset(): void {
    this.routes = [];
    this.calls.length = 0;
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => {
      const method = req.method ?? "GET";
      const path = req.url ?? "/";
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === "string") headers[k] = v;
      }
      this.calls.push({ method, path, body, headers });

      const route = this.routes.find((r) => {
        if (r.method !== method) return false;
        if (typeof r.path === "string") return path === r.path || path.startsWith(r.path + "?");
        return r.path.test(path);
      });

      if (!route) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found", path }));
        return;
      }

      if (route.handler) {
        const result = route.handler(req, body);
        const respHeaders = { "Content-Type": "application/json", ...result.headers };
        res.writeHead(result.status, respHeaders);
        res.end(result.body != null ? JSON.stringify(result.body) : "");
        return;
      }

      const respHeaders = { "Content-Type": "application/json", ...route.headers };
      res.writeHead(route.status ?? 200, respHeaders);
      res.end(route.body != null ? JSON.stringify(route.body) : "");
    });
  }
}
