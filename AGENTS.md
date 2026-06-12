<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ⚠️ Infrastructure — DO NOT TOUCH (locked, owner-mandated 2026-06-12)

`vercel.json` MUST keep `"regions": ["sin1"]`. The Supabase DB and all users are in
Singapore; without this line Vercel runs functions in iad1 (US East) and every page
pays multiple trans-Pacific round trips (~1.5s TTFB, measured). Never remove or
change this when editing vercel.json (e.g. when adding crons).

# Visual / Design Style — "Vibrant Tonal Cards × Mascot Theme" (locked-in, owner-approved)

The owner approved the card pattern on 2026-06-09 and the mascot color theme on 2026-06-12.
Keep ALL new UI consistent with it.
Base aesthetic = clean Apple/iCloud minimal, BUT with deliberate color — never flat white-on-white.
Color identity comes from the JadHor mascot: **navy** (หลังคา `#16264c`), **gold** (กุญแจ `#d4a548`),
**warm cream** surfaces (ตัวบ้าน — app background `--jh-surface: #f7f4ed`, NOT cool gray).
Tailwind `blue-*` and `orange-*` scales are remapped to navy/gold in `globals.css` `@theme` —
use them freely; they render as brand colors.

**Card pattern (stat cards, quick-action cards, feature tiles):**
- Background: a soft diagonal tonal gradient, NOT plain white.
  `style={{ background: "linear-gradient(150deg, <gradFrom> 0%, <gradTo> 100%)" }}`
- Border: `border border-white/60` (soft, not gray hairline) on gradient cards.
- Radius: `rounded-[var(--jh-radius-2xl)]` for hero/stat cards.
- Shadow: `shadow-[var(--jh-shadow-card)]`, hover → `shadow-[var(--jh-shadow-md)]`.
- Hover motion: `transition-all duration-300 ease-out hover:-translate-y-1`.

**Icon chip (the little square in each card):**
- Solid vibrant fill + white icon + a colored glow shadow (NOT pale tint + colored icon).
  `style={{ background: "<solid>", color: "#fff", boxShadow: "0 10px 22px -8px <solid>" }}`
- Wrap card in `group`; chip gets `transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`.
- Lucide icons at `strokeWidth={2}`.

**Numbers / key values:** colored in the tone's ink color (e.g. `var(--jh-blue)`), `font-bold` — not default near-black.

**Primary CTA buttons:** solid tone color + white text + colored shadow
(`shadow-[0_8px_18px_-6px_<solid>]`), hover lifts (`hover:-translate-y-0.5`). Avoid pale tint-only buttons for primary actions.

**Per-tone palette (solid / gradFrom / gradTo / ink):**
- navy   `#34508c` / `#f3f5fa` / `#e4eaf5` / `var(--jh-blue)`       ← primary (mascot roof)
- gold   `#d4a548` / `#fdf8ee` / `#f6ecd6` / `var(--jh-orange-ink)` ← secondary (mascot key)
- green  `#34c759` / `#f3fcf6` / `#e0f7e9` / `var(--jh-green-ink)`
- indigo `#5856d6` / `#f6f6ff` / `#e8e7fb` / `var(--jh-indigo)`
- purple `#af52de` / `#fbf5fe` / `#f3e3fb` / `var(--jh-purple)`
- red    `#ff3b30` / `#fff5f4` / `#ffe5e3` / `var(--jh-red)`

Reference implementation: `src/app/dashboard/page.tsx` (StatCard + quick-action cards).
Design tokens live in `src/app/globals.css` under `--jh-*`. Thai-first UI copy.
