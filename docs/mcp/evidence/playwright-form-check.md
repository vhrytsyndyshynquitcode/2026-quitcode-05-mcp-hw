# Перевірка форми заявки через Playwright MCP

- **Дата:** 2026-10-11 · Claude Code 2.1.283 · Claude Opus 5.5
- **Сесія:** headless `claude -p --strict-mcp-config --mcp-config <лише playwright з .mcp.json>` у корені
  репозиторію — піднято **лише** `playwright`; Supabase і Vercel у сесії немає. Діють правила
  `.claude/settings.json` (deny на `browser_run_code_unsafe`, `webmcp_*`, `browser_file_upload`,
  `browser_drop`, `browser_evaluate`; в allow — 10 точних імен для перевірки форми).
- **Застосунок:** `npm run dev`, `http://localhost:3000` (локальні дані в пам'яті, без n8n).
- **Сервер:** `@playwright/mcp@0.0.82 --isolated --no-webmcp --allowed-origins http://localhost:3000`, Chrome.

## Запит

> Відкрий http://localhost:3000, заповни форму заявки тестовими даними, відправ, перевір консоль і
> мережу. Інших адрес не відкривай. Тестові дані — лише вигадані, email на домені example.test. …

## Ланцюжок інструментів

1. `ToolSearch` — завантажив схеми інструментів Playwright (сам Claude Code, не сервер)
2. `mcp__playwright__browser_navigate` `{"url":"http://localhost:3000"}`
3. `mcp__playwright__browser_snapshot`
4. `mcp__playwright__browser_fill_form` — ім'я «Тестовий», прізвище «Користувач», email
   `test.lead@example.test`, телефон `+380000000000`, компанія «Тестова Компанія», сайт
   `https://example.test` (лише текст у полі), бюджет «$500–1500 / міс.», опис — тестовий текст;
   згоду на розсилку не ставив
5. `mcp__playwright__browser_click` — «Надіслати заявку»
6. `mcp__playwright__browser_snapshot`
7. `mcp__playwright__browser_console_messages` `{"level":"debug","all":true}`
8. `mcp__playwright__browser_network_requests` `{"static":false}`, потім `{"static":true}`

`permission_denials`: порожньо — усі виклики з `allow`, жодного запиту на схвалення; заборонених
інструментів агент не пробував.

## Результат

- **Форма відправилась:** так. Форма зникла, натомість — «Дякуємо! Заявку отримано. Ми зв'яжемося з
  вами протягом робочого дня.» Адреса лишилась `/`.
- **Консоль:** 0 помилок, 0 попереджень. Лише службові повідомлення dev-режиму: INFO про React
  DevTools і LOG `[HMR] connected`.
- **Мережа:** після відправки — один запит `POST http://localhost:3000/` → **200** (Server Action).
  До відправки — 22 запити на документ, CSS, JS-чанки, шрифти й favicon, усі 200 і всі на
  `localhost:3000`. Зовнішніх запитів не було.
- Тестова заявка лягла лише в сховище застосунку в пам'яті (`lib/db.ts`) і зникла після перезапуску
  dev-сервера.

## Що варто відзначити

- Агент сам не відкривав `https://example.test` — адреса лише вписана в поле «Сайт».
- `browser_network_request` (одиничний запит із заголовками й тілом, зокрема `Cookie`) не
  викликався; він ні в allow, ні в deny — у headless-сесії його виклик був би відхилений.
- Тека `.playwright-mcp/` у `.gitignore`; у git її немає.
