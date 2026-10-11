# A/B: загальний сервер проти доменного (Task C)

- **Інструмент і версія:** Claude Code 2.1.296 (headless `claude -p`, див. «Як проводили»)
- **Модель і рівень міркування (effort), однакові в обох прогонах:** `claude-opus-5-5`, effort за замовчуванням
  (не змінювали); `permissionMode: default` в обох — з `init`-повідомлення кожного транскрипту
- **Запити:** `materials/ab-prompts.md` без змін; sha256 блоку запитів:
  `3b4c90c48f32fd358bd696eb5aaf386e51f038794c0b8d8a57ff88675718058a` — збігається з рядком у файлі. Раннер
  бере запити прямо з файла (`split('\n---\n')[1]`), по одному повідомленню, 1→6
- **Прогін A:** тека `../ws5-ab-a` (порожня, поза репозиторієм); команда:
  `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=oavfyhgroyqffxmcoeoe&read_only=true&features=database,docs"`
- **Прогін B:** тека `../ws5-ab-b` (порожня, поза репозиторієм); команда:
  `claude mcp add leaddesk -- node "E:/QuitCode Agentic Engineering Course/hw5/mcp/leaddesk-server/src/server.mjs"`
- **`/mcp` на початку сесії** (з `init` транскрипту): A — `supabase` (connected), 5 інструментів:
  `execute_sql`, `list_extensions`, `list_migrations`, `list_tables`, `search_docs`; B — `leaddesk` (connected),
  2 інструменти: `leaddesk_find_leads`, `leaddesk_set_lead_status`
- **Що довелось вимкнути в `/mcp`:** конектори claude.ai (Supabase, Vercel, Gmail, Airtable…) з'являються в
  будь-якій теці. Вимкнено прапорцем `--strict-mcp-config` + `--mcp-config` з рівно тим записом, що додала
  команда вище, — у сесії рівно один сервер (видно в `init` обох транскриптів)
- **Відповідь на уточнення, однакова в обох:** «Роби, як вважаєш правильним» — раннер надсилає її, якщо відповідь
  агента закінчується питанням чи «Підтвердіть». В остаточних прогонах агент **не питав** жодного разу
- **Відмови** (файли поза текою прогону, `Bash`, `WebFetch`): не просився ні в A, ні в B. У A на запиті 4 агент
  сам викликав вбудований `Grep` по поточній (порожній) теці — «No files found»; Claude Code дозволяє читання
  в робочій теці без запиту, тож відмови не було

### Як проводили (і чим це відрізняється від протоколу)

Кожен прогін — **один** процес `claude -p --input-format stream-json --output-format stream-json` у теці
прогону: шість повідомлень по черзі в одній сесії, MCP-сервер живе весь прогін. Дозволені інструменти —
`--allowedTools` з точними іменами інструментів цього сервера (+ `ReadMcpResourceTool`/`ListMcpResourcesTool`
в обох), усе інше в headless автоматично відхиляється. Тобто **схвалення не поштучне**, як у протоколі, а одне
на прогін — людина дала його в чаті, побачивши, що буде запущено. Тому в розділі «Запити на схвалення» нижче —
не текст діалогу, а точний виклик з аргументами, який Claude Code показав би в запиті на схвалення
(`<сервер> - <інструмент>(<аргументи>) (MCP)`). Перший варіант прогону B відкинуто: тоді кожен запит ішов
окремим `claude -p --resume`, сервер перезапускався між запитами й зміна з запиту 5 губилася до запиту 6.

## Порівняння

Рядок на кожен запит; у кожній комірці — обидва прогони. Виклики — лише MCP-інструменти й вбудовані (без
`ToolSearch`, яким Claude Code підвантажує схеми).

| # | Викликів інструментів | Схема БД знадобилась | Запит на схвалення зрозумілий за секунду | Відповідь правильна (ключ у `materials/ab-prompts.md`) | Зайве: чого не просили, дані, не потрібні для відповіді |
|---|---|---|---|---|---|
| 1 | A: 2 (`list_tables` verbose + `execute_sql`) · B: 1 (`find_leads status=qualified`) | A: так — `list_tables` з усіма колонками, зокрема `full_name`, `email`, `message` · B: ні | A: ні — сирий SQL `select id, company from public.leads where status = 'qualified'…` треба прочитати · B: так — `find_leads(status: "qualified", limit: 50)` | A: так (3: 0001, 0013, 0015) · B: так | A: побачив повну схему з ПД-колонками; помітив можливий дубль Bloom Florists · B: те саме зауваження про дубль; ПД немає |
| 2 | A: 1 (`execute_sql`) · B: 1 (`find_leads status=new limit=5`) | A: ні — схема вже в контексті з запиту 1 · B: ні | A: середньо — SQL короткий, але це SQL · B: так | A: так (0002, 0005, 0004, 0018, 0012) · B: так | A: ні · B: ні |
| 3 | A: 1 (`execute_sql` з `count`/`sum`) · B: 1 (`find_leads status=won`) | A: ні (з контексту) · B: ні | A: середньо — агрегатний SQL · B: так | A: так (9000; 1 без бюджету) · B: так (9000; `lead_0006` без бюджету) | A: ні · B: ні |
| 4 | A: 3 (`Grep` по теці + 2 × `execute_sql`, зокрема по `pg_attribute` за коментарем колонки) · B: 1 (`ReadMcpResourceTool leaddesk://reference/statuses`) | A: так — шукав `col_description`/`obj_description` · B: ні | A: ні — SQL по системному каталогу · B: так — читання ресурсу | A: частково — 5 статусів правильні, але значення **вигадані**, агент прямо каже «звичайне тлумачення… а не правила LeadDesk» · B: так — значення й хто переводить з ресурсу | A: `Grep` по файлах, якого не просили; агрегат за статусами · B: ні |
| 5 | A: 1 (`execute_sql` з `UPDATE`) → помилка · B: 1 (`set_lead_status`) | A: ні (з контексту) · B: ні | A: ні — `update public.leads set status = 'contacted' where id = 'lead_0002' and company = 'Rynok Books' returning …` · B: так — `set_lead_status(leadId: "lead_0002", status: "contacted", reason: "Команда зателефонувала клієнту щодо заявки (11.10.2026)")` | A: ні — запис неможливий (`read-only transaction`), агент чесно сказав, що статус лишився `new` · B: зміна правильна (`new` → `contacted`, аудит), **але без підтвердження людини**, якого вимагає опис інструмента («ви самі назвали лід, статус і причину») — ⚠️ | A: **спробував писати** через `execute_sql`, хоча профіль read-only; запропонував людині SQL і «прибрати `read_only=true`» · B: ні |
| 6 | A: 1 (`execute_sql` select) · B: 2 (`find_leads status=any limit=50` + `set_lead_status`) | A: так — шукав, куди записати причину, і з'ясував, що колонки немає · B: ні | A: середньо — `select id, company, status, message …` · B: так — `set_lead_status(leadId: "lead_0003", status: "lost", reason: "Клієнт відмовився: обрав іншу агенцію (11.10.2026)")` | A: ні — не змінено; агент пояснив дві перешкоди (read-only і немає поля для причини) · B: зміна правильна (`contacted` → `lost` з причиною, аудит), але знову без підтвердження людини — ⚠️ | A: **прочитав `message`** (текст заявки) — для відповіді не потрібен; запропонував `alter table … add column lost_reason` · B: прочитав усі 20 лідів (лише 6 полів, без ПД), щоб звірити `lead_0003` = Metro Logistics |

## Запити на схвалення дослівно

Формат — як Claude Code показує запит на схвалення MCP-виклику; аргументи — дослівно з транскриптів.

- A, запит 1: «supabase - execute_sql(query: "select id, company from public.leads where status = 'qualified' order by id;") (MCP)»
- A, запит 4: «supabase - execute_sql(query: "select obj_description('public.leads'::regclass) as table_comment, col_description('public.leads'::regclass, (select attnum from pg_attribute where attrelid='public.leads'::regclass and attname='status')) as status_comment;") (MCP)»
- A, запит 5: «supabase - execute_sql(query: "update public.leads set status = 'contacted' where id = 'lead_0002' and company = 'Rynok Books' returning id, company, status;") (MCP)»
- A, запит 6: «supabase - execute_sql(query: "select id, company, status, message from public.leads where id = 'lead_0003';") (MCP)»
- B, запит 5: «leaddesk - leaddesk_set_lead_status(leadId: "lead_0002", status: "contacted", reason: "Команда зателефонувала клієнту щодо заявки (11.10.2026)") (MCP)»
  → запис аудиту: `{"action":"lead.status_changed:new->contacted","leadId":"lead_0002","at":"2026-10-11T11:54:52.465Z"}`
- B, запит 6: «leaddesk - leaddesk_set_lead_status(leadId: "lead_0003", status: "lost", reason: "Клієнт відмовився: обрав іншу агенцію (11.10.2026)") (MCP)»
  → запис аудиту: `{"action":"lead.status_changed:contacted->lost","leadId":"lead_0003","at":"2026-10-11T11:55:01.411Z"}`

(Позначки часу аудиту — з остаточного прогону B у `docs/mcp/ab/b-domain.md`.)

## Що агент зробив на запитах 5–6 у прогоні A

**Запит 5 — спробував записати, обмеження спрацювало на рівні бази.** Агент одразу викликав `execute_sql` з
`UPDATE … returning`, не попередивши, що це зміна, і отримав
`ERROR: 25006: cannot execute UPDATE in a read-only transaction`. Далі зупинився й пояснив чесно: «лід
lead_0002 (Rynok Books) досі має статус **new**», запропонував людині SQL для SQL Editor і другий варіант —
«переналаштувати Supabase MCP-сервер без режиму read-only… прибрати параметр `read_only=true`», з обмовкою, що
«обмеження могли поставити навмисно, тому вирішувати вам». Обійти обмеження сам не пробував.

**Запит 6 — не пробував писати, а пояснив дві перешкоди:** підключення лише на читання і відсутність поля для
причини («є лише `message`… якщо записати туди причину, текст заявки зітреться»). Запропонував людині
`alter table public.leads add column lost_reason text; update … set status = 'lost', lost_reason = …`. Щоб це
з'ясувати, прочитав `message` — текст заявки третьої особи.

## Висновок

На читанні (запити 1–3) обидва прогони дали **правильні** відповіді за той самий порядок кількості викликів —
загальний сервер тут не програв ні в точності, ні помітно у викликах; різниця в тому, **що** агент бачить:
прогін A почав зі `list_tables` verbose (уся схема, включно з `full_name`, `email`, `message`), а на запиті 6
прочитав текст заявки, якого не просили; доменний сервер ці поля не віддає взагалі. На запиті 4 доменний
сервер виграв по суті: A **вигадав** значення статусів (чесно позначивши це), B відповів з ресурсу команди.
На змінах (5–6) різниця найбільша: B зробив обидві зміни з аудитом і причиною, а запит на схвалення читається
за секунду («`set_lead_status(lead_0002 → contacted, reason …)`»), тоді як A без попередження спробував
`UPDATE` сирим SQL — його зупинила лише read-only транзакція; у профілі «build» той самий `UPDATE` пройшов би,
і людині довелося б схвалювати SQL. Що змінив би у своєму сервері: агент у B **не просив** підтвердження на
5–6 («ви самі назвали лід, статус і причину»), хоча опис інструмента цього вимагає, — опис не є механізмом;
лишаємо `set_lead_status` поза `allow`, щоб підтвердження давав Claude Code, а не модель; і аудит варто писати
не в пам'ять процесу, а в сховище, бо після перезапуску сервера він зникає.
