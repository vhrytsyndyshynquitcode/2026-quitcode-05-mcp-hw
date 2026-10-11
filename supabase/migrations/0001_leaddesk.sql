-- LeadDesk leads: the same 20 rows as mcp/leaddesk-server/fixtures/leads.json (materials/leads.json).
-- Statuses are exactly LEAD_STATUSES from lib/types.ts; ids follow leadId() from lib/db.ts.

create table if not exists public.leads (
  id          text        primary key check (id ~ '^lead_\d{4}$'),
  full_name   text        not null,
  company     text        not null,
  email       text        not null,
  source      text        not null check (source in ('website', 'google-ads', 'facebook-ads', 'linkedin', 'referral', 'webinar')),
  status      text        not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  budget      integer     check (budget is null or budget >= 0),
  message     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists leads_status_created_at_idx on public.leads (status, created_at desc);

-- No policies on purpose: the anon and authenticated roles of the Data API see nothing.
-- Only server-side roles (and the MCP server acting as the developer) can read the table.
alter table public.leads enable row level security;
