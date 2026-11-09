import { useEffect, useRef, useState } from "react";
import { steps } from "../lib/content";
import { Reveal, SplitHeading, Tilt } from "../lib/motion";

// Example tools, only here to show how the platform behaves.
const TOOLS = [
  { id: "forms", name: "Forms", hue: "#7c3aed" },
  { id: "docs", name: "Docs", hue: "#d9c7f5" },
  { id: "chat", name: "Chat", hue: "#3d1a6b" },
  { id: "calendar", name: "Calendar", hue: "#d9c7f5" },
  { id: "files", name: "Files", hue: "#7c3aed" },
  { id: "reports", name: "Reports", hue: "#3d1a6b" },
];

const PEOPLE = [
  { name: "Anna", hue: "#7c3aed" },
  { name: "Ben", hue: "#d9c7f5" },
  { name: "Chloe", hue: "#3d1a6b" },
  { name: "Dev", hue: "#7c3aed" },
  { name: "Eli", hue: "#d9c7f5" },
];

/** "How it works": four clickable steps driving a live browser mock-up, with an autoplay walk-through. */
export default function Demo({ heading = true }: { heading?: boolean }) {
  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState("yourdomain");
  const [tools, setTools] = useState<string[]>(["forms", "docs", "chat"]);
  const [invited, setInvited] = useState(0);
  const [access, setAccess] = useState<boolean[]>([true, true, true, true, true]);
  const [copied, setCopied] = useState(false);
  const playing = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const shown = domain.trim() || "yourdomain";
  const people = PEOPLE.slice(0, invited).filter((_, i) => access[i]);

  const flashCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${shown}.com`);
    } catch {
      /* clipboard may be blocked; the confirmation still shows */
    }
    flashCopied();
  };

  const toggleTool = (id: string) => setTools((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  // Scripted walk-through of the four steps. Pressing the button again stops it.
  const play = async () => {
    if (playing.current) {
      playing.current = false;
      return;
    }
    playing.current = true;
    setIsPlaying(true);
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const on = () => playing.current;

    setStep(0);
    setDomain("");
    await wait(500);
    for (const ch of "acmestudio") {
      if (!on()) break;
      setDomain((d) => d + ch);
      await wait(90);
    }
    if (on()) {
      await wait(700);
      setStep(1);
      setTools([]);
      await wait(600);
    }
    for (const id of ["forms", "calendar", "files", "chat"]) {
      if (!on()) break;
      setTools((t) => (t.includes(id) ? t : [...t, id]));
      await wait(450);
    }
    if (on()) {
      await wait(600);
      setStep(2);
      setInvited(0);
      setAccess([true, true, true, true, true]);
      await wait(600);
    }
    for (let n = 1; n <= 3; n++) {
      if (!on()) break;
      setInvited(n);
      await wait(500);
    }
    if (on()) {
      flashCopied();
      await wait(1000);
      setStep(3);
      await wait(900);
      setAccess((a) => a.map((v, j) => (j === 1 ? false : v)));
      await wait(600);
    }
    playing.current = false;
    setIsPlaying(false);
  };

  useEffect(
    () => () => {
      playing.current = false;
    },
    [],
  );

  return (
    <section className="wrap section" id="how">
      {heading && (
        <div className="head">
          <Reveal>
            <p className="label">How it works</p>
          </Reveal>
          <SplitHeading text="Try it. Four steps and you're up and running." className="h2" dimFrom={3} />
        </div>
      )}

      <div className="how">
        <div>
          <button type="button" className={`play-btn ${isPlaying ? "on" : ""}`} onClick={play}>
            <span className="play-ico" aria-hidden>
              {isPlaying ? "■" : "▶"}
            </span>
            {isPlaying ? "Stop the demo" : "Play the demo"}
          </button>

          <ol className="steps" role="tablist" aria-label="Steps">
            {steps.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={step === i}
                  className={`step ${step === i ? "active" : ""}`}
                  onClick={() => setStep(i)}
                >
                  <span className="step-num">{i + 1}</span>
                  <span className="step-text">
                    <span className="step-title">{s.title}</span>
                    <span className="step-desc">{s.text}</span>
                  </span>
                </button>

                {step === i && (
                  <div className="panel">
                    {i === 0 && (
                      <label className="domain-field">
                        <span>Type the name you want</span>
                        <span className="domain-input">
                          <input
                            value={domain}
                            maxLength={24}
                            spellCheck={false}
                            onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            aria-label="Domain name"
                          />
                          <b>.com</b>
                        </span>
                      </label>
                    )}
                    {i === 1 && (
                      <div className="tool-picks">
                        <span className="panel-hint">Tap to add or remove (examples)</span>
                        <div className="tool-chips">
                          {TOOLS.map((t) => (
                            <button
                              type="button"
                              key={t.id}
                              className={`tool-chip ${tools.includes(t.id) ? "on" : ""}`}
                              aria-pressed={tools.includes(t.id)}
                              onClick={() => toggleTool(t.id)}
                            >
                              {tools.includes(t.id) ? "✓ " : "+ "}
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {i === 2 && (
                      <div className="share-row">
                        <button
                          type="button"
                          className="btn btn-fill"
                          disabled={invited >= PEOPLE.length}
                          onClick={() => setInvited((n) => Math.min(PEOPLE.length, n + 1))}
                        >
                          {invited >= PEOPLE.length ? "Everyone's invited" : "Invite someone"}
                        </button>
                        <button type="button" className="btn" onClick={copyLink}>
                          {copied ? "Link copied" : "Copy link"}
                        </button>
                        <span className="panel-hint">{invited === 0 ? "No one invited yet" : `${invited} invited`}</span>
                      </div>
                    )}
                    {i === 3 && (
                      <div className="access">
                        {invited === 0 ? (
                          <span className="panel-hint">Invite people in step 3, then control their access here.</span>
                        ) : (
                          PEOPLE.slice(0, invited).map((p, k) => (
                            <label className="access-row" key={p.name}>
                              <span className="avatar" style={{ background: p.hue }}>
                                {p.name[0]}
                              </span>
                              <span className="access-name">{p.name}</span>
                              <span className={`switch ${access[k] ? "on" : ""}`}>
                                <input
                                  type="checkbox"
                                  checked={access[k]}
                                  onChange={() => setAccess((a) => a.map((v, j) => (j === k ? !v : v)))}
                                  aria-label={`Access for ${p.name}`}
                                />
                                <i />
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                    <button type="button" className="next" onClick={() => setStep((step + 1) % steps.length)}>
                      {i === steps.length - 1 ? "Start over" : "Next step →"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        <Reveal delay={0.1} className="how-visual">
          <Tilt className="tilt-mock" max={5}>
            <div className="mock" aria-hidden>
              <div className="mock-bar">
                <i />
                <i />
                <i />
                <span className={`mock-url ${step === 0 ? "hl" : ""}`}>
                  <b>{shown}</b>.com
                </span>
                <span className={`mock-share ${copied ? "on" : ""} ${step === 2 ? "hl" : ""}`}>
                  {copied ? "Link copied" : "Share"}
                </span>
              </div>

              <div className={`mock-body ${step === 1 ? "hl" : ""}`}>
                {TOOLS.filter((t) => tools.includes(t.id)).map((t) => (
                  <div className="mock-tile" key={t.id}>
                    <span className="mock-ico" style={{ background: t.hue }} />
                    <span className="mock-name">{t.name}</span>
                    <span className="mock-line" />
                  </div>
                ))}
                {tools.length === 0 && <p className="mock-empty">No tools yet. Add some in step 2.</p>}
              </div>

              <div className="mock-foot">
                <span className="mock-avatars">
                  {people.map((p) => (
                    <i key={p.name} style={{ background: p.hue }} />
                  ))}
                </span>
                <span className="mock-note">
                  {people.length === 0
                    ? "No users yet"
                    : `${people.length} ${people.length === 1 ? "user has" : "users have"} access`}
                </span>
              </div>
            </div>
          </Tilt>
        </Reveal>
      </div>
    </section>
  );
}
