import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { DEV_ALLOCATION_PERCENT, fmtInt, swarmBrief, type Plan, type Task } from "../lib/plan";
import { IMD_SWARM_URL } from "../config";

const TABS = [{ id: "tasks", label: "Tasks" }, { id: "token", label: "Token" }, { id: "social", label: "Social" }, { id: "launch", label: "Launch" }] as const;
type TabId = (typeof TABS)[number]["id"];
const STATUS = { review: "Waiting for your review", approved: "Approved", changes: "Changes requested" };

type Props = { plan: Plan | null; onChange: (p: Plan) => void; onClear: () => void; onStart: () => void; onLaunch: (p: Plan) => void; headingRef: RefObject<HTMLHeadingElement> };

export function Studio({ plan, onChange, onClear, onStart, onLaunch, headingRef }: Props) {
  const [tab, setTab] = useState<TabId>("tasks");
  const [msg, setMsg] = useState("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => setTab("tasks"), [plan?.createdAt]);

  if (!plan)
    return (
      <div className="studio-empty card">
        <h2 id="studio-title" ref={headingRef} tabIndex={-1}>Your project studio</h2>
        <p>Describe an idea above and build a plan. Its Swarm tasks, token settings, social drafts and launch steps will appear here, saved in this browser.</p>
        <button type="button" className="button" onClick={onStart}>Describe an idea</button>
      </div>
    );
  const p = plan;
  const approved = p.tasks.filter((t) => t.status === "approved").length;
  const update = (id: string, patch: Partial<Task>) => onChange({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  function onKey(e: KeyboardEvent, i: number) {
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault(); setTab(TABS[n].id); tabRefs.current[n]?.focus();
  }
  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setMsg(`${what} copied.`); }
    catch { setMsg(`Unable to copy. Select the ${what.toLowerCase()} text and copy it manually.`); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${p.ticker.toLowerCase()}-plan.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    setMsg("Plan downloaded as JSON.");
  }
  return (
    <div className="studio card">
      <div className="studio-head">
        <div>
          <h2 id="studio-title" ref={headingRef} tabIndex={-1}>{p.name} <span className="ticker">${p.ticker}</span></h2>
          <p className="muted">{p.mode === "easy" ? "Easy mode" : "Pro mode"}{p.categories.length ? `, ${p.categories.join(", ")}` : ""}. {approved} of {p.tasks.length} deliverables approved.</p>
        </div>
        <div className="actions">
          <button type="button" className="button button-primary" onClick={() => onLaunch(p)}>Launch this token</button>
          <button type="button" className="button" onClick={download}>Download plan</button>
          <button type="button" className="button button-quiet" onClick={onClear}>Clear plan</button>
        </div>
      </div>
      <p className="progress" aria-hidden="true"><span style={{ inlineSize: `${(approved / p.tasks.length) * 100}%` }} /></p>
      <div role="tablist" aria-label="Project studio" className="tabs">
        {TABS.map((t, i) => (
          <button key={t.id} ref={(el) => { tabRefs.current[i] = el; }} role="tab" type="button" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} className="tab" onClick={() => setTab(t.id)} onKeyDown={(e) => onKey(e, i)}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="panel" tabIndex={0}>
        {tab === "tasks" && (
          <>
            <div className="swarm-bar">
              <p className="hint">IMD Swarm workers pick up these deliverables from the brief. {IMD_SWARM_URL ? "Send it to start the work." : "Copy the brief into your IMD Swarm job."}</p>
              <div className="actions">
                <button type="button" className="button button-small" onClick={() => copy(swarmBrief(p), "Swarm brief")}>Copy Swarm brief</button>
                {IMD_SWARM_URL && <a className="button button-small" href={IMD_SWARM_URL} target="_blank" rel="noopener noreferrer">Open IMD Swarm</a>}
              </div>
            </div>
            <ul className="task-list">{p.tasks.map((t) => <TaskRow key={t.id} task={t} onUpdate={(patch) => update(t.id, patch)} />)}</ul>
          </>
        )}
        {tab === "token" && (
          <dl className="facts">
            <div><dt>Name and ticker</dt><dd>{p.name}, <span className="num">${p.ticker}</span></dd></div>
            <div><dt>Total supply</dt><dd className="num">{fmtInt(p.supply)}</dd></div>
            <div><dt>Developer allocation ({DEV_ALLOCATION_PERCENT}%)</dt><dd className="num">{fmtInt(p.developerAllocation)}, vested through LaunchLab</dd></div>
            <div><dt>Sold on the curve or seeding the pool</dt><dd className="num">{fmtInt(p.curveAllocation)}</dd></div>
            <div><dt>Developer initial purchase</dt><dd className="num">{p.initialBuySol ? `${p.initialBuySol} SOL, from the developer's own wallet` : "None"}</dd></div>
            <div><dt>Creator fee distribution</dt><dd className="num">Creators {p.fees.creators}%, holders {p.fees.holders}%, treasury {p.fees.treasury}%</dd></div>
          </dl>
        )}
        {tab === "social" && (
          <div className="drafts">
            <div className="draft">
              <h3>X announcement</h3>
              <p className="draft-text">{p.posts.x}</p>
              <div className="draft-foot"><span className="muted num">{p.posts.x.length} of 280 characters</span><button type="button" className="button" onClick={() => copy(p.posts.x, "X post")}>Copy X post</button></div>
            </div>
            <div className="draft">
              <h3>Telegram welcome</h3>
              <p className="draft-text">{p.posts.telegram}</p>
              <div className="draft-foot"><span className="muted">Pinned in the group after you authorize it.</span><button type="button" className="button" onClick={() => copy(p.posts.telegram, "Telegram message")}>Copy Telegram message</button></div>
            </div>
          </div>
        )}
        {tab === "launch" && (
          <ol className="steps">
            <li><h3>Approve the deliverables</h3><p>{approved === p.tasks.length ? "Done: every deliverable is approved." : `${p.tasks.length - approved} still need your review in Tasks.`}</p></li>
            <li><h3>Review and sign the token creation</h3><p>Your Solana wallet shows the exact transaction. AI workers never hold your keys or sign for you.</p></li>
            <li><h3>Trade on the bonding curve</h3><p>Raydium LaunchLab opens trading on a bonding curve with {p.ticker}'s settings.</p></li>
            <li><h3>Graduate to a Raydium pool</h3><p>When the curve reaches its graduation target, liquidity moves into a Raydium pool.</p></li>
          </ol>
        )}
      </div>
      <p className="visually-hidden" role="status">{msg}</p>
      {msg && <p className="hint" aria-hidden="true">{msg}</p>}
    </div>
  );
}

function TaskRow({ task, onUpdate }: { task: Task; onUpdate: (p: Partial<Task>) => void }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(task.note ?? "");
  const [err, setErr] = useState("");
  const id = `note-${task.id}`;
  return (
    <li className="task">
      <div className="task-main">
        <h3>{task.deliverable}</h3>
        <p className="muted">{task.worker}</p>
        <p>{task.summary}</p>
        {task.status === "changes" && task.note && !editing && <p className="task-note">Your note: {task.note}</p>}
      </div>
      <div className="task-side">
        <p className={`status status-${task.status}`}><span aria-hidden="true">{task.status === "approved" ? "✓" : task.status === "changes" ? "↺" : "○"}</span> {STATUS[task.status]}</p>
        {!editing && (
          <div className="actions">
            {task.status !== "approved"
              ? <button type="button" className="button button-small" onClick={() => onUpdate({ status: "approved" })}>Approve<span className="visually-hidden"> {task.deliverable}</span></button>
              : <button type="button" className="button button-small button-quiet" onClick={() => onUpdate({ status: "review" })}>Undo approval<span className="visually-hidden"> of {task.deliverable}</span></button>}
            <button type="button" className="button button-small button-quiet" onClick={() => setEditing(true)}>Request changes<span className="visually-hidden"> to {task.deliverable}</span></button>
          </div>
        )}
      </div>
      {editing && (
        <form className="note-form" noValidate onSubmit={(e) => {
          e.preventDefault();
          if (note.trim().length < 3) { setErr("Say what should change, for example a color or a feature."); return; }
          onUpdate({ status: "changes", note: note.trim() }); setEditing(false); setErr("");
        }}>
          <label htmlFor={id}>What should change in the {task.deliverable.toLowerCase()}?</label>
          <textarea id={id} rows={2} autoFocus value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }} aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-error` : undefined} />
          {err && <p id={`${id}-error`} className="error">{err}</p>}
          <div className="actions">
            <button type="submit" className="button button-small">Send request</button>
            <button type="button" className="button button-small button-quiet" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </li>
  );
}
