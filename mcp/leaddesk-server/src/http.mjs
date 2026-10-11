// LeadDesk MCP server over Streamable HTTP (bonus E1) — the same factory as the stdio server.
//
//   node src/http.mjs          → http://127.0.0.1:3333/mcp   (LEADDESK_HTTP_PORT to change the port)
//
// Local only: listens on 127.0.0.1, and every request first passes the Host and Origin guards
// (DNS rebinding: a page on evil.example must not reach a localhost MCP server through the browser).
// The guards are CALLED here, in the request handler: passing them as an option to toNodeHandler
// is silently ignored and the server would answer 200 to a forged Host.
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from "@modelcontextprotocol/node";
import { factory } from "./leaddesk.mjs";

const PORT = Number(process.env.LEADDESK_HTTP_PORT ?? 3333);

const mcp = toNodeHandler(createMcpHandler(factory));
const checkHost = localhostHostValidation();
const checkOrigin = localhostOriginValidation();

createServer(async (req, res) => {
  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
  if (new URL(req.url ?? "/", "http://127.0.0.1").pathname !== "/mcp") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found: MCP endpoint is /mcp\n");
    return;
  }
  await mcp(req, res);
}).listen(PORT, "127.0.0.1", () => {
  console.error(`leaddesk MCP over HTTP: http://127.0.0.1:${PORT}/mcp`);
});
