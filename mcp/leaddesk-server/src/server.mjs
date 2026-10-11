// LeadDesk MCP server over stdio (Task A).
//
//   node src/server.mjs                                   offline on fixtures/leads.json
//   LEADDESK_FIXTURE=/path/to/leads.json node src/server.mjs
//
// stdout is the protocol channel: nothing else may write to it.
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { factory } from "./leaddesk.mjs";

await serveStdio(factory);
