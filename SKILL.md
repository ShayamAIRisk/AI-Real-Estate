# SKILL.md — PropAI UAE
> Read this file before writing any code, creating any component, or designing any database schema for this project.
> This file defines the tech stack, conventions, data sources, and agent architecture for PropAI — an AI-powered UAE real estate investment platform.

---

## 1. Project overview

PropAI replaces traditional real estate agents with AI agents that:
1. Are trained by the operator with custom investment criteria and instructions
2. Search UAE property data from multiple live sources
3. Score and reason about deals using Claude (Anthropic API)
4. Route matched deals to the right investor profiles

**Current geography:** UAE (Dubai primary, Abu Dhabi and Northern Emirates secondary)
**Future geographies:** UK, KSA — design with multi-geography in mind from the start

---

## 2. Tech stack — exact versions

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 14.x (App Router) | Use `app/` directory, not `pages/` |
| Language | TypeScript | 5.x | Strict mode enabled. No `any` types. |
| Styling | Tailwind CSS | 3.x | Utility classes only. No custom CSS files unless unavoidable. |
| UI components | shadcn/ui | latest | Import from `@/components/ui/`. Do not re-implement base components. |
| Database | Supabase (Postgres) | latest JS client v2 | `@supabase/supabase-js` v2. Use server client in API routes, browser client in components. |
| Auth | Supabase Auth | — | Email + magic link. No password auth for MVP. |
| AI | Anthropic Claude | `claude-sonnet-4-20250514` | Always this model. Never hardcode other model strings. |
| Search | Tavily API | REST | For live web search during agent runs. |
| Property data | BayutAPI (RapidAPI) | REST | Unofficial Bayut API via RapidAPI. Host: `bayut14.p.rapidapi.com` |
| DLD data | Dubai Land Dept API | REST | Official. Requires DLD business account. Base: `https://dubailand.gov.ae` |
| Hosting | Vercel | — | Auto-deploy from GitHub main branch. |
| Package manager | npm | — | Never use yarn or pnpm. |

---

## 3. Project structure

```
propai/
├── SKILL.md                          ← this file
├── .env.local                        ← never commit. See section 4 for keys.
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── app/
│   ├── layout.tsx                    ← root layout, fonts, providers
│   ├── page.tsx                      ← landing / redirect to /dashboard
│   ├── dashboard/
│   │   └── page.tsx                  ← main app shell
│   ├── agents/
│   │   ├── page.tsx                  ← agent list
│   │   └── [id]/page.tsx             ← agent detail + training form
│   ├── search/
│   │   └── page.tsx                  ← deal search UI
│   ├── routing/
│   │   └── page.tsx                  ← investor routing UI
│   └── api/
│       ├── agents/
│       │   ├── route.ts              ← GET list, POST create
│       │   └── [id]/route.ts         ← GET, PUT, DELETE single agent
│       ├── search/
│       │   └── route.ts              ← property search via BayutAPI
│       ├── agent-run/
│       │   └── route.ts              ← run agent: search + Claude analysis
│       └── routing/
│           └── route.ts              ← match deals to investors
│
├── components/
│   ├── ui/                           ← shadcn/ui primitives (auto-generated)
│   ├── agents/
│   │   ├── AgentForm.tsx
│   │   ├── AgentCard.tsx
│   │   └── CriteriaEditor.tsx
│   ├── deals/
│   │   ├── DealCard.tsx
│   │   ├── DealScore.tsx
│   │   └── DealReasoningPanel.tsx
│   ├── routing/
│   │   ├── InvestorForm.tsx
│   │   └── MatchCard.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── TopNav.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 ← browser client (singleton)
│   │   └── server.ts                 ← server client for API routes
│   ├── anthropic.ts                  ← Anthropic client + agent runner
│   ├── bayut.ts                      ← BayutAPI wrapper
│   ├── dld.ts                        ← Dubai Land Dept API wrapper
│   ├── tavily.ts                     ← Tavily search wrapper
│   └── utils.ts                      ← shared helpers (AED formatting, etc.)
│
└── types/
    ├── agent.ts
    ├── deal.ts
    ├── investor.ts
    └── search.ts
```

---

## 4. Environment variables

```bash
# .env.local — never commit this file

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # server-only, never expose to browser

# Property data
RAPIDAPI_KEY=...                        # used for BayutAPI (host: bayut14.p.rapidapi.com)
DLD_API_KEY=...                         # Dubai Land Department API key

# Search
TAVILY_API_KEY=tvly-...
```

**Rules:**
- Variables prefixed `NEXT_PUBLIC_` are safe to use in browser components
- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are server-only — never import in client components
- All API calls to Anthropic, Bayut, DLD, and Tavily must go through `app/api/` routes, never directly from the browser

---

## 5. Database schema (Supabase / Postgres)

### 5.1 Naming conventions
- Table names: `snake_case`, plural (e.g. `agents`, `deals`, `investors`)
- Column names: `snake_case`
- Foreign keys: `{table_singular}_id` (e.g. `agent_id`)
- Timestamps: always `created_at` and `updated_at` (use Supabase default `now()`)
- UUIDs: always use `uuid` type with `gen_random_uuid()` default for primary keys

### 5.2 Core tables

```sql
-- Agents: the AI personas trained by the operator
create table agents (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  geography     text not null default 'UAE',           -- 'UAE' | 'UK' | 'KSA'
  instructions  text not null,                          -- full system prompt written by operator
  criteria      jsonb not null default '[]',            -- array of CriteriaItem (see types)
  data_sources  jsonb not null default '[]',            -- enabled source IDs
  status        text not null default 'active',         -- 'active' | 'idle' | 'archived'
  deals_count   integer not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Deals: AI-analysed property opportunities
create table deals (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid references agents(id) on delete set null,
  title         text not null,
  location      text not null,
  emirate       text not null,                          -- 'Dubai' | 'Abu Dhabi' | 'Sharjah' | etc.
  district      text,                                   -- e.g. 'Business Bay', 'Downtown Dubai'
  price_aed     bigint not null,                        -- always store in AED (fils = integers)
  property_type text not null,                          -- see PropertyType enum in types/deal.ts
  bedrooms      integer,
  area_sqft     integer,
  gross_yield   numeric(5,2),                           -- percentage e.g. 8.50
  net_yield     numeric(5,2),
  monthly_rent_aed bigint,
  roi_projected numeric(5,2),
  ai_score      integer check (ai_score >= 0 and ai_score <= 100),
  ai_reasoning  text,
  ai_flags      jsonb default '[]',                     -- array of risk flag strings
  raw_listing   jsonb,                                  -- original Bayut/DLD payload
  source        text not null default 'bayut',          -- 'bayut' | 'property_finder' | 'dld' | 'manual'
  source_url    text,
  status        text not null default 'new',            -- 'new' | 'reviewed' | 'routed' | 'closed'
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Investors: profiles used for deal routing
create table investors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  budget_min_aed bigint,
  budget_max_aed bigint,
  strategy      text,                                   -- free-text strategy description
  preferred_emirates jsonb default '["Dubai"]',         -- array of emirates
  preferred_types    jsonb default '[]',                -- array of PropertyType
  min_yield     numeric(4,2),
  notes         text,
  status        text not null default 'active',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Deal-investor routing matches
create table deal_routings (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid references deals(id) on delete cascade,
  investor_id   uuid references investors(id) on delete cascade,
  match_score   integer check (match_score >= 0 and match_score <= 100),
  match_reason  text,
  status        text not null default 'pending',        -- 'pending' | 'sent' | 'viewed' | 'interested' | 'declined'
  created_at    timestamptz default now()
);

-- Agent run logs: track every AI analysis run
create table agent_runs (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid references agents(id) on delete set null,
  query         text,                                   -- the search query used
  deals_found   integer default 0,
  deals_scored  integer default 0,
  duration_ms   integer,
  error         text,
  created_at    timestamptz default now()
);
```

### 5.3 Row Level Security
Always enable RLS on every table. For MVP, use a simple policy:
```sql
alter table agents enable row level security;
-- Add policies based on auth.uid() once auth is wired up
```

---

## 6. TypeScript types

```typescript
// types/agent.ts
export type AgentStatus = 'active' | 'idle' | 'archived'
export type Geography = 'UAE' | 'UK' | 'KSA'
export type CriteriaType = 'must' | 'nice' | 'avoid'

export interface CriteriaItem {
  id: string           // nanoid
  text: string
  type: CriteriaType
}

export interface DataSource {
  id: string           // e.g. 'bayut', 'dld', 'tavily_news', 'rental_stats'
  label: string
  enabled: boolean
}

export interface Agent {
  id: string
  name: string
  geography: Geography
  instructions: string
  criteria: CriteriaItem[]
  data_sources: DataSource[]
  status: AgentStatus
  deals_count: number
  created_at: string
  updated_at: string
}

// types/deal.ts
export type PropertyType =
  | 'apartment'
  | 'villa'
  | 'townhouse'
  | 'penthouse'
  | 'studio'
  | 'office'
  | 'retail'
  | 'warehouse'
  | 'land'
  | 'hotel_apartment'

export type DealStatus = 'new' | 'reviewed' | 'routed' | 'closed'
export type DealSource = 'bayut' | 'property_finder' | 'dld' | 'manual'

export type RiskFlag =
  | 'service_charge_high'
  | 'leasehold_risk'
  | 'off_plan_risk'
  | 'low_liquidity_area'
  | 'epc_poor'
  | 'developer_unverified'
  | 'yield_unconfirmed'
  | 'price_above_market'
  | 'legal_dispute_risk'

export interface Deal {
  id: string
  agent_id: string | null
  title: string
  location: string
  emirate: string
  district: string | null
  price_aed: number
  property_type: PropertyType
  bedrooms: number | null
  area_sqft: number | null
  gross_yield: number | null
  net_yield: number | null
  monthly_rent_aed: number | null
  roi_projected: number | null
  ai_score: number | null
  ai_reasoning: string | null
  ai_flags: RiskFlag[]
  raw_listing: Record<string, unknown> | null
  source: DealSource
  source_url: string | null
  status: DealStatus
  created_at: string
  updated_at: string
}

// types/investor.ts
export interface Investor {
  id: string
  name: string
  email: string | null
  budget_min_aed: number | null
  budget_max_aed: number | null
  strategy: string | null
  preferred_emirates: string[]
  preferred_types: PropertyType[]
  min_yield: number | null
  notes: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface DealRouting {
  id: string
  deal_id: string
  investor_id: string
  match_score: number
  match_reason: string
  status: 'pending' | 'sent' | 'viewed' | 'interested' | 'declined'
  created_at: string
}
```

---

## 7. Currency and number formatting

**All monetary values are stored as integers in AED (fils precision not required for property).**

```typescript
// lib/utils.ts — use these helpers everywhere, never format inline

export function formatAED(aed: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(aed)
  // Output: "AED 1,250,000"
}

export function formatAEDCompact(aed: number): string {
  if (aed >= 1_000_000) return `AED ${(aed / 1_000_000).toFixed(1)}M`
  if (aed >= 1_000) return `AED ${(aed / 1_000).toFixed(0)}K`
  return formatAED(aed)
  // Output: "AED 1.2M" or "AED 850K"
}

export function formatYield(pct: number): string {
  return `${pct.toFixed(1)}%`
}

export function formatSqft(sqft: number): string {
  return `${sqft.toLocaleString('en-AE')} sq ft`
}
```

**Never display raw numbers.** Always use a formatter. Never use `$` — the currency is always AED. For UK geography, a separate `formatGBP` function will be added in `lib/utils.ts`.

---

## 8. UAE property data sources

### 8.1 BayutAPI (primary — via RapidAPI)
- **Base URL:** `https://bayut14.p.rapidapi.com`
- **Auth header:** `x-rapidapi-key: ${process.env.RAPIDAPI_KEY}` + `x-rapidapi-host: bayut14.p.rapidapi.com`
- **Key endpoints:**
  - `GET /search-property` — search listings (params: `purpose`, `categoryExternalID`, `locationExternalIDs`, `priceMin`, `priceMax`, `bedsMin`)
  - `GET /get-property-details` — full detail by `externalID`
  - `GET /get-transactions` — sales transaction history by location
  - `GET /search-projects` — off-plan new developments
  - `GET /get-location-info` — resolve location name → ID

```typescript
// lib/bayut.ts pattern
export async function searchProperties(params: BayutSearchParams): Promise<BayutProperty[]> {
  const url = new URL('https://bayut14.p.rapidapi.com/search-property')
  // append params...
  const res = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
      'x-rapidapi-host': 'bayut14.p.rapidapi.com',
    },
    next: { revalidate: 300 }, // cache 5 min
  })
  if (!res.ok) throw new Error(`BayutAPI error: ${res.status}`)
  const data = await res.json()
  return data.data?.properties ?? []
}
```

### 8.2 Dubai Land Department (DLD) API
- **Base URL:** `https://dubailand.gov.ae` (official API gateway)
- **Auth:** DLD business account required. Key passed as header.
- **Key data:** rental index, transaction records, property registration
- **Note:** Requires formal registration for production access. For MVP, use BayutAPI transaction data as a proxy.

### 8.3 Tavily (web search — news, planning, market reports)
- Used during agent runs to supplement structured data with news and analysis
- Query examples: `"Business Bay Dubai rental yield 2025"`, `"Dubai real estate market Q1 2025"`

```typescript
// lib/tavily.ts pattern
export async function searchWeb(query: string, maxResults = 5): Promise<TavilyResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: maxResults,
      include_answer: true,
    }),
  })
  const data = await res.json()
  return data.results ?? []
}
```

### 8.4 UAE geography reference

```typescript
export const UAE_EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain',
] as const

export const DUBAI_DISTRICTS = [
  'Downtown Dubai', 'Business Bay', 'Dubai Marina', 'JBR',
  'Palm Jumeirah', 'DIFC', 'JLT', 'JVC', 'Dubai Hills Estate',
  'Arabian Ranches', 'Dubai Silicon Oasis', 'Mirdif',
  'Deira', 'Bur Dubai', 'Al Barsha', 'Motor City',
  'Dubai Sports City', 'International City', 'Discovery Gardens',
  'Dubai South', 'Dubailand', 'MBR City', 'Creek Harbour',
] as const

export const ABU_DHABI_DISTRICTS = [
  'Saadiyat Island', 'Yas Island', 'Al Reem Island', 'Corniche',
  'Al Khalidiyah', 'Masdar City', 'Al Reef', 'Bloom Gardens',
] as const
```

---

## 9. Agent prompt architecture

This is the core of PropAI. When a user runs an agent, the system builds a prompt dynamically from the saved agent config.

### 9.1 System prompt structure

```typescript
// lib/anthropic.ts

export function buildAgentSystemPrompt(agent: Agent): string {
  const criteriaByType = {
    must: agent.criteria.filter(c => c.type === 'must'),
    nice: agent.criteria.filter(c => c.type === 'nice'),
    avoid: agent.criteria.filter(c => c.type === 'avoid'),
  }

  return `You are ${agent.name}, an AI real estate investment analyst specialising in the ${agent.geography} market.

## Your persona and strategy
${agent.instructions}

## Investment criteria
${criteriaByType.must.length > 0 ? `**Must have:**\n${criteriaByType.must.map(c => `- ${c.text}`).join('\n')}` : ''}
${criteriaByType.nice.length > 0 ? `**Nice to have:**\n${criteriaByType.nice.map(c => `- ${c.text}`).join('\n')}` : ''}
${criteriaByType.avoid.length > 0 ? `**Avoid:**\n${criteriaByType.avoid.map(c => `- ${c.text}`).join('\n')}` : ''}

## UAE market context
- Currency: AED (UAE Dirham). All prices are in AED.
- Freehold vs leasehold: freehold areas allow foreign ownership. Always flag if leasehold.
- Golden Visa threshold: properties AED 2M+ qualify the buyer for a UAE Golden Visa — this is a selling point.
- Key ownership costs: 4% DLD transfer fee, 2% agency fee, ~AED 4,000 registration
- Service charges vary widely: Dubai Marina ~AED 20-30/sqft/yr, Downtown ~AED 25-35/sqft/yr
- RERA regulates all real estate transactions. All agents must be RERA certified.
- Rental yields in Dubai typically range 5–10% gross depending on area and type.
- Off-plan risk: check developer track record, escrow compliance, and RERA registration.

## Output format
You must respond ONLY with valid JSON matching this schema — no prose, no markdown:
{
  "score": number,              // 0-100 investment score
  "summary": string,            // 2-3 sentence verdict
  "reasoning": string,          // detailed reasoning paragraph
  "flags": string[],            // risk flags from the RiskFlag enum
  "yield_estimate": number,     // gross yield % if calculable, else null
  "recommendation": "strong_buy" | "buy" | "watch" | "pass",
  "comparables_note": string    // brief note on comparable deals or market context
}
`
}
```

### 9.2 Agent run function

```typescript
// lib/anthropic.ts

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runAgentOnDeal(
  agent: Agent,
  deal: Partial<Deal>,
  marketContext?: string
): Promise<AgentAnalysis> {

  const systemPrompt = buildAgentSystemPrompt(agent)

  const userMessage = `
Analyse this UAE property deal:

Title: ${deal.title}
Location: ${deal.location}, ${deal.emirate}
Price: AED ${deal.price_aed?.toLocaleString()}
Type: ${deal.property_type}
Bedrooms: ${deal.bedrooms ?? 'N/A'}
Area: ${deal.area_sqft ? `${deal.area_sqft} sq ft` : 'N/A'}
Estimated monthly rent: ${deal.monthly_rent_aed ? `AED ${deal.monthly_rent_aed.toLocaleString()}` : 'Unknown'}
Source: ${deal.source_url ?? 'N/A'}

${marketContext ? `Additional market context:\n${marketContext}` : ''}

Score this deal against my criteria and provide your analysis as JSON.
`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')

  // Strip markdown fences if present
  const clean = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(clean) as AgentAnalysis
}
```

### 9.3 AgentAnalysis type

```typescript
// types/agent.ts
export type Recommendation = 'strong_buy' | 'buy' | 'watch' | 'pass'

export interface AgentAnalysis {
  score: number
  summary: string
  reasoning: string
  flags: RiskFlag[]
  yield_estimate: number | null
  recommendation: Recommendation
  comparables_note: string
}
```

---

## 10. API route patterns

All API routes follow this pattern. Never return raw errors to the client.

```typescript
// app/api/agents/route.ts pattern
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/agents]', err)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('agents')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/agents]', err)
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}
```

---

## 11. Component conventions

### 11.1 General rules
- All components are functional with TypeScript props interfaces
- Props interface named `{ComponentName}Props`
- Use `'use client'` directive only when component needs browser APIs or event handlers
- Server components (no directive) for anything that only reads data
- Never fetch data directly in components — use `lib/` functions or SWR hooks

### 11.2 Data fetching in client components

```typescript
// Use SWR for client-side data fetching
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function AgentList() {
  const { data: agents, isLoading, error } = useSWR<Agent[]>('/api/agents', fetcher)
  // ...
}
```

### 11.3 Form handling

```typescript
// Use react-hook-form + zod for all forms
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const AgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  instructions: z.string().min(20, 'Instructions too short').max(5000),
  geography: z.enum(['UAE', 'UK', 'KSA']),
})
```

### 11.4 Loading states
Always show a loading skeleton, never a spinner. Use shadcn/ui `Skeleton` component.

---

## 12. Supabase client setup

```typescript
// lib/supabase/client.ts — browser client (singleton)
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createBrowserSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}

// lib/supabase/server.ts — server client for API routes
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role for server-side operations
  )
}
```

---

## 13. Error handling conventions

```typescript
// Always use this pattern for async operations
type Result<T> = { data: T; error: null } | { data: null; error: string }

export async function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}
```

---

## 14. What NOT to do

- **Never** use `any` type in TypeScript
- **Never** call Anthropic, Bayut, DLD, or Tavily APIs directly from client components — always via `/api/` routes
- **Never** store API keys in client-side code or `NEXT_PUBLIC_` variables
- **Never** format currency inline — always use `formatAED()` from `lib/utils.ts`
- **Never** use `pages/` router — this project uses `app/` router only
- **Never** hardcode UAE district names or emirates — import from `lib/utils.ts` constants
- **Never** return raw Supabase errors to the frontend — log server-side, return generic messages
- **Never** skip loading/error states in components
- **Never** add a geography (UK, KSA) without creating a new agent type — the multi-geo design is deliberate

---

## 15. Adding a new geography (future)

When adding UK or KSA support:
1. Add geography value to `Geography` type in `types/agent.ts`
2. Add geography-specific constants in `lib/utils.ts` (districts, currency formatter, etc.)
3. Add a new data source lib file (e.g. `lib/rightmove.ts`)
4. Update `buildAgentSystemPrompt()` with a geography-specific context block
5. Add currency formatter (`formatGBP`, `formatSAR`)
6. Do NOT change the database schema — `geography` column already supports it

---

*Last updated: May 2026 | Stack: Next.js 14 · Supabase · Anthropic Claude Sonnet · Vercel · BayutAPI · DLD API*
