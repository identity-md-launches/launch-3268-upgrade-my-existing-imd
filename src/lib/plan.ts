export type Mode = "easy" | "pro";
export type Fees = { creators: number; holders: number; treasury: number };
export type ProInput = { name: string; ticker: string; supply: string; initialBuySol: string; fees: Fees };
export type TaskStatus = "review" | "approved" | "changes";
export type Task = { id: string; worker: string; deliverable: string; summary: string; status: TaskStatus; note?: string };
export type Plan = {
  version: 1;
  createdAt: string;
  mode: Mode;
  idea: string;
  name: string;
  ticker: string;
  categories: string[];
  supply: number;
  developerAllocation: number;
  curveAllocation: number;
  initialBuySol: number;
  fees: Fees;
  tasks: Task[];
  posts: { x: string; telegram: string };
};
export type PlanErrors = Partial<Record<"idea" | "name" | "ticker" | "supply" | "initialBuySol" | "fees", string>>;

export const DEFAULT_FEES: Fees = { creators: 50, holders: 30, treasury: 20 };
export const DEFAULT_SUPPLY = 1e9;
export const DEV_ALLOCATION_PERCENT = 1;
export const MAX_INITIAL_BUY_SOL = 100;
export const EXAMPLE_IDEA =
  "A racing game where players breed snail champions, with a token for entry fees and a weekly community tournament on Telegram.";

const STOP = new Set(
  "a an and the for with where who that this to of in on at by from my our your their is are be it as or into about which will can game app token coin project community players people users weekly daily based build create make makes breed breeds track tracks help helps let lets earn earns play plays run runs turn turns where".split(" "),
);
const CATEGORIES = [
  { label: "Game", words: /\b(game|games|gaming|play|player|players|race|racing|quest|arcade|tournament)\b/i },
  { label: "Application", words: /\b(app|apps|tool|tools|platform|dashboard|bot|wallet|tracker|marketplace)\b/i },
  { label: "Meme", words: /\b(meme|memes|dog|cat|frog|pepe|joke|funny)\b/i },
  { label: "DeFi", words: /\b(defi|yield|stake|staking|lend|lending|swap|liquidity)\b/i },
  { label: "Art and NFTs", words: /\b(art|artist|nft|nfts|collection|music|musician)\b/i },
  { label: "AI", words: /\b(ai|agent|agents|model|assistant)\b/i },
];

export const parseWhole = (v: string) => Number(v.replace(/[,_\s]/g, ""));

export function validatePlan(idea: string, mode: Mode, pro: ProInput): PlanErrors {
  const e: PlanErrors = {};
  const t = idea.trim();
  if (t.split(/\s+/).filter(Boolean).length < 4) e.idea = "Describe your idea in at least 4 words, for example who it is for and what it does.";
  else if (t.length > 600) e.idea = "Keep the idea under 600 characters. Details can be added in the studio.";
  if (mode === "pro") {
    if (pro.name.trim() && pro.name.trim().length > 32) e.name = "Use a name of 32 characters or fewer.";
    if (pro.ticker.trim() && !/^[A-Za-z0-9]{2,10}$/.test(pro.ticker.trim())) e.ticker = "Use 2 to 10 letters or digits for the ticker.";
    const s = parseWhole(pro.supply);
    if (!Number.isInteger(s) || s < 1e7 || s > 1e12) e.supply = "Enter a whole number between 10,000,000 and 1,000,000,000,000.";
    const b = pro.initialBuySol.trim() === "" ? 0 : Number(pro.initialBuySol);
    if (!Number.isFinite(b) || b < 0 || b > MAX_INITIAL_BUY_SOL) e.initialBuySol = `Enter an amount from 0 to ${MAX_INITIAL_BUY_SOL} SOL, or leave it empty.`;
    const { creators: c, holders: h, treasury: r } = pro.fees;
    if ([c, h, r].some((v) => !Number.isInteger(v) || v < 0 || v > 100) || c + h + r !== 100)
      e.fees = `Make the three shares add up to 100%. They add up to ${c + h + r}% now.`;
  }
  return e;
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
export function nameFromIdea(idea: string) {
  const words = idea.replace(/[^A-Za-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase())).slice(0, 2).map(cap);
  return words.length ? words.join(" ") : "New Project";
}
export function tickerFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts.map((p) => p.slice(0, 2)).join("") : parts[0] ?? "IMD").replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase() || "NEW";
}
export const categoriesFor = (idea: string) => CATEGORIES.filter((c) => c.words.test(idea)).map((c) => c.label);

function tasksFor(name: string, ticker: string, cats: string[], mode: Mode): Task[] {
  const t: Omit<Task, "status">[] = [
    { id: "brief", worker: "Project director", deliverable: "Project brief and milestones", summary: `Turns the idea into a scoped brief for ${name}, with launch, growth and post-launch milestones.` },
    { id: "token", worker: "Token agent", deliverable: `${ticker} token configuration`, summary: "Prepares name, ticker, supply, the 1% developer allocation and the bonding-curve settings for review." },
    { id: "brand", worker: "Designer", deliverable: "Logo and brand kit", summary: "Drafts a logo, color palette and social banners in three directions to choose from." },
    { id: "site", worker: "Developer", deliverable: "Project website", summary: "Builds a one-page site with the token details, roadmap and community links." },
  ];
  if (cats.includes("Game")) t.push({ id: "game", worker: "Developer", deliverable: "Playable browser game", summary: "Builds a first playable version of the game loop that can be shared from the website." });
  if (cats.includes("Application")) t.push({ id: "app", worker: "Developer", deliverable: "Application prototype", summary: "Builds a working prototype of the core feature with the screens the brief names." });
  t.push(
    { id: "docs", worker: "Developer", deliverable: "Documentation and tokenomics page", summary: "Writes plain-language docs covering supply, allocations, fees and how the launch works." },
    { id: "security", worker: "Security reviewer", deliverable: "Launch configuration review", summary: "Checks the token settings, fee recipients and treasury signers before anything is signed." },
    { id: "marketing", worker: "Marketing agent", deliverable: "Launch campaign", summary: "Plans the announcement schedule, launch-day posts and milestone updates." },
    { id: "social", worker: "Social media manager", deliverable: "X posts and Telegram community", summary: "Drafts posts and a Telegram welcome message. Nothing is published until you authorize it." },
  );
  if (mode === "pro") t.push({ id: "analytics", worker: "Analytics agent", deliverable: "Project dashboard", summary: "Sets up holder, volume and community metrics for the project studio." });
  return t.map((x) => ({ ...x, status: "review" as const }));
}

function postsFor(name: string, ticker: string, idea: string) {
  const clean = idea.trim().replace(/\s+/g, " ");
  const short = clean.length > 150 ? `${clean.slice(0, 147).trimEnd()}…` : clean;
  const x = `${name} ($${ticker}) is coming to Solana. ${short} Launching on IMD Launchpad with a transparent 1% developer allocation.`;
  const telegram = `Welcome to the ${name} community. Here is the plan: ${clean}\n\nPinned: token details, the roadmap and how to verify official links. Admins will never message you first or ask for a seed phrase.`;
  return { x: x.length > 280 ? `${x.slice(0, 279)}…` : x, telegram };
}

export function buildPlan(idea: string, mode: Mode, pro: ProInput, now = new Date()): Plan {
  const name = mode === "pro" && pro.name.trim() ? pro.name.trim() : nameFromIdea(idea);
  const ticker = mode === "pro" && pro.ticker.trim() ? pro.ticker.trim().toUpperCase() : tickerFromName(name);
  const supply = mode === "pro" ? parseWhole(pro.supply) : DEFAULT_SUPPLY;
  const dev = Math.floor((supply * DEV_ALLOCATION_PERCENT) / 100);
  const cats = categoriesFor(idea);
  return {
    version: 1, createdAt: now.toISOString(), mode, idea: idea.trim(), name, ticker, categories: cats, supply,
    developerAllocation: dev, curveAllocation: supply - dev,
    initialBuySol: mode === "pro" && pro.initialBuySol.trim() ? Number(pro.initialBuySol) : 0,
    fees: mode === "pro" ? { ...pro.fees } : { ...DEFAULT_FEES },
    tasks: tasksFor(name, ticker, cats, mode), posts: postsFor(name, ticker, idea),
  };
}

/** A plain-text job brief IMD Swarm workers can pick up. */
export function swarmBrief(p: Plan) {
  const lines = [
    `# ${p.name} ($${p.ticker})`, "", p.idea, "",
    `Mode: ${p.mode === "easy" ? "Easy" : "Pro"}${p.categories.length ? `, ${p.categories.join(", ")}` : ""}`,
    `Supply: ${fmtInt(p.supply)}; developer allocation ${DEV_ALLOCATION_PERCENT}% (${fmtInt(p.developerAllocation)})`,
    `Developer initial purchase: ${p.initialBuySol ? `${p.initialBuySol} SOL` : "none"}`, "", "## Deliverables",
    ...p.tasks.map((t) => `- [${t.status === "approved" ? "x" : " "}] ${t.deliverable} (${t.worker})${t.note ? `: change requested, ${t.note}` : ""}`),
  ];
  return lines.join("\n");
}

export const fmtInt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const PLAN_KEY = "imd-launchpad:plan";
export function savePlan(p: Plan | null) {
  try { if (p) localStorage.setItem(PLAN_KEY, JSON.stringify(p)); else localStorage.removeItem(PLAN_KEY); } catch { /* storage unavailable */ }
}
export function loadPlan(): Plan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && p.version === 1 && Array.isArray(p.tasks) ? p : null;
  } catch { return null; }
}
