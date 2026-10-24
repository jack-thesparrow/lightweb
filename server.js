import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(rootDir, "public");
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";
const startedAt = Date.now();

let requests = 0;
let greetings = 0;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendText(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function serveStatic(req, res, pathname) {
  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    sendText(res, 400, "Bad request");
    return;
  }

  if (relativePath === "") {
    relativePath = "index.html";
  }

  const filePath = normalize(join(publicDir, relativePath));
  if (filePath !== publicDir && !filePath.startsWith(publicDir + sep)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new Error("Not a file");
    }

    const body = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    sendText(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  requests += 1;
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");

  let url;
  try {
    url = new URL(req.url, "http://localhost");
  } catch {
    sendText(res, 400, "Bad request");
    return;
  }

  const { pathname, searchParams } = url;

  if (pathname === "/api/health") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    sendJson(res, 200, {
      status: "ok",
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
    return;
  }

  if (pathname === "/api/greeting") {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const name = (searchParams.get("name") || "").trim().slice(0, 40) || "world";
    greetings += 1;

    sendJson(res, 200, {
      message: `Hello, ${name}!`,
      source: "Node.js backend",
      timestamp: new Date().toISOString(),
      greetingsServed: greetings,
    });
    return;
  }

  if (pathname === "/api/stats") {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    sendJson(res, 200, {
      greetingCount: greetings,
      requestCount: requests,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
    return;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "API route not found" });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method not allowed");
    return;
  }

  await serveStatic(req, res, pathname);
});

server.listen(port, host, () => {
  console.log(`lightweb listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
