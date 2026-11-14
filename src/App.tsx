import { useEffect, useRef, useState } from "react";
import { SolanaProvider } from "./wallet/SolanaProvider";
import { Header } from "./components/Header";
import { Composer } from "./components/Composer";
import { Studio } from "./components/Studio";
import { LaunchForm } from "./components/LaunchForm";
import { TradePanel, TxVerify } from "./components/TradePanel";
import { Watchlist, loadWatchlist, saveWatchlist, type Watch } from "./components/Watchlist";
import { Revenue } from "./components/Revenue";
import { loadPlan, savePlan, type Plan } from "./lib/plan";
import type { LaunchForm as LaunchDraft } from "./lib/launchParams";
import { IMD_NFT_CONTRACT, type ClusterId } from "./config";

const WORKERS = [
  { role: "Project director", job: "Scopes the brief, sets milestones and routes work to the other workers." },
  { role: "Developers", job: "Build the website, games, applications and the project dashboard." },
  { role: "Designers", job: "Create the logo, brand kit, banners and interface visuals." },
  { role: "Token agent", job: "Prepares token settings, tokenomics and the launch configuration." },
  { role: "Marketing agent", job: "Plans campaigns, announcements and milestone updates." },
  { role: "Social media manager", job: "Drafts X posts and runs Telegram community tasks you authorize." },
  { role: "Security reviewer", job: "Checks configurations, fee recipients and contracts before you sign." },
  { role: "Analytics agent", job: "Tracks holders, volume and community growth after launch." },
];

export function App() {
  return <SolanaProvider><Page /></SolanaProvider>;
}

function Page() {
  const [plan, setPlan] = useState<Plan | null>(() => loadPlan());
  const [draft, setDraft] = useState<Partial<LaunchDraft> | null>(null);
  const [watch, setWatch] = useState<Watch[]>(loadWatchlist);
  const [tradeMint, setTradeMint] = useState("");
  const studioHeading = useRef<HTMLHeadingElement>(null);
  const focusStudio = useRef(false);

  useEffect(() => {
    savePlan(plan);
    if (focusStudio.current && studioHeading.current) {
      focusStudio.current = false;
      studioHeading.current.focus({ preventScroll: true });
      studioHeading.current.scrollIntoView({ block: "start" });
    }
  }, [plan]);
  useEffect(() => saveWatchlist(watch), [watch]);

  const onPlan = (p: Plan) => { focusStudio.current = true; setPlan(p); };
  const toIdea = () => { const el = document.getElementById("idea"); el?.scrollIntoView({ block: "center" }); el?.focus({ preventScroll: true }); };
  const goto = (id: string, focusId?: string) => requestAnimationFrame(() => { document.getElementById(id)?.scrollIntoView({ block: "start" }); if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true }); });
  const launchFromPlan = (p: Plan) => {
    setDraft({ name: p.name, symbol: p.ticker, supply: String(p.supply), description: p.idea.slice(0, 500), initialBuySol: p.initialBuySol ? String(p.initialBuySol) : "" });
    goto("launch", "name");
  };
  const onLaunched = (mint: string, label: string, cluster: ClusterId) => {
    setWatch((w) => (w.some((x) => x.mint === mint && x.cluster === cluster) ? w : [{ mint, label, cluster }, ...w]));
    setTradeMint(mint);
  };
  const onTrade = (mint: string) => { setTradeMint(mint); goto("trade", "trade-mint"); };

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <h1 id="hero-title">Idea in. Ecosystem out.</h1>
              <p className="lede">Describe a project and IMD Swarm's AI workers build its Solana token, website, brand and community.</p>
            </div>
            <Composer onPlan={onPlan} />
          </div>
        </section>

        <section id="studio" className="section" aria-labelledby="studio-title">
          <div className="wrap">
            <Studio plan={plan} onChange={setPlan} onStart={toIdea} onLaunch={launchFromPlan} headingRef={studioHeading}
              onClear={() => { setPlan(null); requestAnimationFrame(() => studioHeading.current?.focus()); }} />
          </div>
        </section>

        <section id="launch" className="section" aria-labelledby="launch-title">
          <div className="wrap">
            <div className="section-intro">
              <h2 id="launch-title">Launch on a bonding curve</h2>
              <p>Tokens launch through Raydium LaunchLab. Buyers trade against a bonding curve until it reaches its target, then liquidity graduates to a Raydium pool. You sign every step in your own wallet.</p>
            </div>
            <div className="split split-top split-wide-first">
              <LaunchForm draft={draft} onLaunched={onLaunched} />
              <ol className="steps card">
                <li><h3>A transparent 1% developer allocation</h3><p>Every launch reserves 1% of supply in LaunchLab, shown in the review before you sign. A second approval assigns it to the creator wallet as a vesting record, which the page reads back from Solana before calling it allocated.</p></li>
                <li><h3>An optional initial purchase</h3><p>The developer can make a separate first buy with their own SOL, in the same signing step as the creation.</p></li>
                <li><h3>Trading opens on the curve</h3><p>Price follows the curve as people buy and sell, with liquidity held by the LaunchLab program.</p></li>
                <li><h3>Graduation to a Raydium pool</h3><p>At the graduation target, liquidity moves into a Raydium pool for open trading.</p></li>
              </ol>
            </div>
          </div>
        </section>

        <section id="trade" className="section" aria-labelledby="trade-title">
          <div className="wrap stack">
            <div className="section-intro">
              <h2 id="trade-title">Trade the curve, track the market</h2>
              <p>Buy and sell LaunchLab tokens on their bonding curve, read straight from Solana. Graduated tokens show live price, liquidity, volume and market cap from DexScreener.</p>
            </div>
            <TradePanel mint={tradeMint} />
            <div className="split split-top">
              <div className="section-intro">
                <h3>Watchlist</h3>
                <p>Keep the tokens you follow with live market data, a chart and trade links side by side.</p>
              </div>
              <Watchlist items={watch} onChange={setWatch} onTrade={onTrade} />
            </div>
            <div className="split split-top">
              <div className="section-intro">
                <h3>Verify a transaction</h3>
                <p>Paste any signature to read its status, slot, fee and the programs it called, straight from the network selected at the top.</p>
              </div>
              <TxVerify />
            </div>
          </div>
        </section>

        <section id="swarm" className="section" aria-labelledby="swarm-title">
          <div className="wrap">
            <div className="section-intro">
              <h2 id="swarm-title">AI workers you direct</h2>
              <p>IMD Swarm coordinates specialised workers on your project. You watch progress, approve each deliverable or request changes, and keep building after launch.</p>
            </div>
            <ul className="worker-grid">{WORKERS.map((w) => <li key={w.role}><h3>{w.role}</h3><p>{w.job}</p></li>)}</ul>
          </div>
        </section>

        <section id="workers" className="section" aria-labelledby="workers-title">
          <div className="wrap split">
            <div className="section-intro">
              <h2 id="workers-title">Your IMD NFT can work</h2>
              <p>Holders of IMD NFTs on Ethereum register eligible workers, complete real development and ecosystem tasks, and earn IMD for verified contributions.</p>
              {!IMD_NFT_CONTRACT && <p className="hint">Worker registration opens on this page once the IMD NFT contract is published.</p>}
            </div>
            <ol className="steps card">
              <li><h3>Prove ownership</h3><p>Sign a message with the Ethereum wallet that holds the NFT. Nothing is transferred.</p></li>
              <li><h3>Register the worker</h3><p>The eligible NFT becomes a registered worker with its own dashboard.</p></li>
              <li><h3>Take assignments</h3><p>Pick up Swarm jobs and track completed work, performance and assignments.</p></li>
              <li><h3>Earn IMD</h3><p>Rewards are paid in IMD after each contribution is reviewed and verified.</p></li>
            </ol>
          </div>
        </section>

        <section id="rewards" className="section" aria-labelledby="rewards-title">
          <div className="wrap">
            <div className="section-intro">
              <h2 id="rewards-title">Where platform revenue goes</h2>
              <p>Revenue comes from launch fees, premium AI creation tools, paid Swarm services, subscriptions and supported integrations. Enter an amount to see the proposed split.</p>
            </div>
            <div className="split split-top split-wide-first">
              <Revenue />
              <div className="stack">
                <div><h3>IMD buyback and burn</h3><p>The burn share buys IMD on Ethereum and sends it to a burn address. Each burn is listed with its transaction, next to revenue allocations, treasury balances and history.</p></div>
                <div><h3>Creator and holder fees</h3><p>Creators choose how eligible trading fees are shared between themselves, token holders and the project treasury, where the launch infrastructure supports it. Developers also earn IMD rewards.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="community" className="section" aria-labelledby="community-title">
          <div className="wrap split split-top">
            <div className="stack">
              <h2 id="community-title">Communities that outlast creators</h2>
              <div><h3>A Social Hub for every project</h3><p>Connect X and Telegram, draft announcements with AI help and manage the community. Posts go out only after you authorize publishing.</p></div>
              <div><h3>Community takeover, by vote</h3><p>When a creator abandons a project, eligible holders can propose a takeover, vote on it and recover the administration rights the project supports. Governance cannot seize private wallets or assets outside its authorized control.</p></div>
            </div>
            <div className="stack">
              <h2 id="studio-forever-title">A studio that stays</h2>
              <p>Every launched project keeps a permanent workspace: website, branding, token configuration, Swarm tasks, campaigns, analytics, team permissions, community tools and development history.</p>
              <p>Growth tools add discovery, launch notifications, referral programs, milestones, community achievements and ecosystem analytics.</p>
            </div>
          </div>
        </section>

        <section id="security" className="section" aria-labelledby="security-title">
          <div className="wrap">
            <div className="section-intro">
              <h2 id="security-title">Your keys stay yours</h2>
              <p>The launchpad is non-custodial. AI workers never get unrestricted access to wallets or private keys.</p>
            </div>
            <ul className="worker-grid">
              <li><h3>Explicit approvals</h3><p>Every transaction is shown in your wallet and needs your signature.</p></li>
              <li><h3>Multisig treasuries</h3><p>Project and ecosystem treasuries move funds only with several signers.</p></li>
              <li><h3>Reviewed contracts</h3><p>Security reviewers check configurations and contracts before launch.</p></li>
              <li><h3>Verified on-chain data</h3><p>Launches and trades are read back from Solana and link to the transactions behind them.</p></li>
            </ul>
          </div>
        </section>

        <section id="chains" className="section" aria-labelledby="chains-title">
          <div className="wrap">
            <div className="section-intro">
              <h2 id="chains-title">Two chains, kept apart</h2>
              <p>Each asset stays on its own chain, and every transaction names the chain it runs on.</p>
            </div>
            <div className="chain-grid">
              <div className="card"><h3>Solana</h3><ul className="ticks"><li>Token creation on Raydium LaunchLab</li><li>Bonding curves and liquidity</li><li>Trading and Raydium pools</li></ul></div>
              <div className="card"><h3>Ethereum</h3><ul className="ticks"><li>The IMD token</li><li>NFT worker ownership checks</li><li>IMD rewards, buyback and burn</li></ul></div>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <p className="footer-title">IMD is where ideas become projects.</p>
            <p className="muted">Describe it, build it, launch it, trade it and grow it from one place.</p>
          </div>
          <button type="button" className="button button-primary" onClick={toIdea}>Describe your idea</button>
        </div>
      </footer>
    </>
  );
}
