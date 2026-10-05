// LeadDesk as a domain MCP server (Task A, Workshop 5).
// Two business verbs instead of SQL on the whole database:
//   leaddesk_find_leads       — leads by status, newest first; reads only
//   leaddesk_set_lead_status  — changes one lead's status and writes an audit entry
// plus the resource leaddesk://reference/statuses — what each status means for the team.
//
//   node src/server.mjs                                   offline on fixtures/leads.json
//   LEADDESK_FIXTURE=/path/to/leads.json node src/server.mjs
//
// The fixture is read once; changes live only in this process's memory and the file is never
// rewritten. stdout is the protocol channel: logs go to stderr (console.error) only, without personal data.
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Same vocabulary as the app: LEAD_STATUSES in lib/types.ts, leadId() in lib/db.ts.
const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const LEAD_ID = /^lead_\d{4}$/;

// Resolved from this module, not from the cwd: Claude Code does not start the server from your terminal.
const FIXTURE = process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));

// Loaded lazily once per process; every later read and write works on this in-memory copy.
let leadsPromise;
const loadLeads = () => (leadsPromise ??= readFile(FIXTURE, "utf8").then((text) => JSON.parse(text)));
const audit = [];

// Only what the two verbs need: no name, e-mail or message text leaves the server.
const publicLead = ({ id, company, status, source, budget, createdAt }) => ({ id, company, status, source, budget, createdAt });

const describeLead = (l) => `${l.id} · ${l.company} · ${l.status} · ${l.source} · бюджет ${l.budget ?? "—"} · ${l.createdAt.slice(0, 10)}`;

const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

const STATUS_REFERENCE = `# Статуси лідів LeadDesk

Рівно п'ять статусів — ті самі, що \`LEAD_STATUSES\` у застосунку. Інших не буває.

| Статус | Що означає для команди Studio Nova | Хто переводить |
|---|---|---|
| \`new\` | Заявка прийшла з форми чи іншого джерела, ніхто з нею ще не говорив | Ставиться автоматично під час створення ліда |
| \`contacted\` | Менеджер вийшов на зв'язок (дзвінок, лист, зустріч) і отримав або чекає відповідь | Менеджер — одразу після першого контакту |
| \`qualified\` | Підтверджено потребу, бюджет і того, хто приймає рішення; є сенс готувати кошторис | Менеджер після розмови про задачу й бюджет |
| \`won\` | Клієнт погодив кошторис або підписав договір | Лише власник акаунта (owner) після підтвердження клієнта |
| \`lost\` | Клієнт відмовився, не відповідає після трьох спроб або задача нам не підходить | Менеджер; причину обов'язково вказати |

## Правила переходів

- Зазвичай: \`new\` → \`contacted\` → \`qualified\` → \`won\` або \`lost\`.
- \`lost\` можна поставити з будь-якого статусу; повернути з \`lost\` у роботу — лише з причиною.
- Кожна зміна статусу — запис в аудиті \`{ action, leadId, at }\` і причина (\`reason\`).
- Перед зміною статусу агент показує людині, який лід, на що і чому, — і чекає підтвердження.
`;

const factory = () => {
  const server = new McpServer({ name: "leaddesk", version: "0.1.0" });

  server.registerTool(
    "leaddesk_find_leads",
    {
      title: "Знайти ліди за статусом",
      description:
        "Повертає ліди LeadDesk із заданим статусом, найновіші першими. Для кожного ліда — лише id, company, status, source, budget, createdAt (без імені, email і тексту заявки). Застосовуй, щоб побачити, хто в роботі, або знайти id ліда перед зміною статусу. Тільки читає, нічого не змінює.",
      inputSchema: {
        status: z
          .enum([...LEAD_STATUSES, "any"])
          .describe("Який статус шукати: new, contacted, qualified, won або lost; any — ліди з усіма статусами. Що означає кожен — у ресурсі leaddesk://reference/statuses"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Скільки лідів повернути, ціле від 1 до 50. За замовчуванням 10"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, limit = 10 }) => {
      try {
        const all = await loadLeads();
        const matching = all
          .filter((l) => status === "any" || l.status === status)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const leads = matching.slice(0, limit).map(publicLead);
        const head = `Знайдено ${matching.length} лідів зі статусом ${status}; показано ${leads.length}, найновіші першими.`;
        return {
          content: [{ type: "text", text: [head, ...leads.map(describeLead)].join("\n") }],
          structuredContent: { status, total: matching.length, count: leads.length, leads },
        };
      } catch (e) {
        console.error("leaddesk_find_leads failed:", e.message);
        return fail("Не вдалося прочитати ліди. Спробуйте ще раз або перевірте, що сервер бачить fixtures/leads.json.");
      }
    },
  );

  server.registerTool(
    "leaddesk_set_lead_status",
    {
      title: "Змінити статус ліда",
      description:
        "ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і пише запис в аудит { action, leadId, at }. Перед викликом покажи людині, який лід, на який статус і чому, і дочекайся її підтвердження. Статус — лише один із п'яти (див. ресурс leaddesk://reference/statuses). Невідомий id або той самий статус, що вже стоїть, — помилка, нічого не змінюється. id ліда шукай через leaddesk_find_leads.",
      inputSchema: {
        leadId: z
          .string()
          .regex(LEAD_ID)
          .describe("Ідентифікатор ліда у форматі lead_ і чотири цифри, напр. lead_0002. Знайти його можна через leaddesk_find_leads"),
        status: z
          .enum(LEAD_STATUSES)
          .describe("Новий статус: new, contacted, qualified, won або lost. Має відрізнятися від поточного"),
        reason: z
          .string()
          .trim()
          .min(3)
          .max(500)
          .describe("Чому змінюємо статус, 3–500 символів, напр. «дзвінок 05.10: клієнт підтвердив бюджет». Без персональних даних"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ leadId, status, reason }) => {
      try {
        const all = await loadLeads();
        const lead = all.find((l) => l.id === leadId);
        if (!lead) {
          return fail(`Лід ${leadId} не знайдено. Знайдіть правильний id через leaddesk_find_leads (status: "any").`);
        }
        if (lead.status === status) {
          return fail(`Лід ${leadId} уже має статус ${status} — нічого не змінено. Оберіть інший статус або перевірте поточний через leaddesk_find_leads.`);
        }
        const previousStatus = lead.status;
        lead.status = status;
        const entry = { action: `lead.status_changed:${previousStatus}->${status}`, leadId, at: new Date().toISOString() };
        audit.push(entry);
        return {
          content: [{ type: "text", text: `Статус ${leadId} (${lead.company}) змінено: ${previousStatus} → ${status}. Причина: ${reason}. Запис аудиту: ${entry.action} о ${entry.at}.` }],
          structuredContent: { lead: publicLead(lead), previousStatus, reason, audit: entry },
        };
      } catch (e) {
        console.error("leaddesk_set_lead_status failed:", e.message);
        return fail("Не вдалося змінити статус. Нічого не змінено.");
      }
    },
  );

  server.registerResource(
    "leaddesk-statuses",
    "leaddesk://reference/statuses",
    {
      title: "Статуси лідів LeadDesk",
      description: "П'ять статусів ліда і що кожен означає для команди: коли ставиться, хто переводить, правила переходів",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: STATUS_REFERENCE }] }),
  );

  return server;
};

await serveStdio(factory);
