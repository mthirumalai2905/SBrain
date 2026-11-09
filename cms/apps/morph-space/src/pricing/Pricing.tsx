import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ANNUAL_SAVING, faqs, periods, plans as defaultPlans, setAnnualSaving, type Period, type Plan } from "../lib/content";
import { asWords, edit, mediaUrl, Sections, slugify, useSections, wordsOf, type Sec } from "../lib/cms";
import { quote, usd, useRates } from "../lib/pricing";
import Icon from "../components/Icon";
import CtaBand from "../components/CtaBand";
import Faq from "../components/Faq";
import { Scene } from "../components/Scene";
import { RollText } from "../components/Morph";
import { onSpotMove, Reveal, useHashScroll } from "../lib/motion";

const registerHref = (p: Plan, period: Period) => `/contact?plan=${p.id}&billing=${period}#register`;

const Check = (props: Record<string, string>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

function BillingToggle({ value, onChange, s }: { value: Period; onChange: (p: Period) => void; s?: Sec }) {
  const i = periods.findIndex((p) => p.id === value);
  return (
    <div className="billing" role="radiogroup" aria-label="Billing period" style={{ "--i": i, "--n": periods.length } as CSSProperties}>
      <span className="billing-thumb" aria-hidden />
      {periods.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={value === p.id}
          className={value === p.id ? "on" : ""}
          onClick={() => onChange(p.id)}
          {...(s ? edit(s, p.id === "yearly" ? "annualLabel" : "monthlyLabel") : {})}
        >
          {(p.id === "yearly" ? s?.annualLabel : s?.monthlyLabel) || p.label}
          {p.id === "yearly" && <span className="billing-save">Save {ANNUAL_SAVING}%</span>}
        </button>
      ))}
    </div>
  );
}

function Plans({ plans, period, selected, onSelect, s }: { plans: Plan[]; period: Period; selected: string; onSelect: (id: string) => void; s?: Sec }) {
  useRates();
  const s_ = s;
  const at = (field: string) => (s ? edit(s, field) : {});
  const onKey = (e: KeyboardEvent<HTMLElement>, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step) {
      e.preventDefault();
      const next = plans[(i + step + plans.length) % plans.length];
      onSelect(next.id);
      document.getElementById(`plan-${next.id}`)?.focus();
    } else if ((e.key === " " || e.key === "Enter") && e.target === e.currentTarget) {
      e.preventDefault();
      onSelect(plans[i].id);
    }
  };

  return (
    <div className="plans" role="radiogroup" aria-label="Plans">
      {plans.map((p, i) => {
        const q = quote(p, period);
        const on = selected === p.id;
        const paid = !!p.monthly;
        const annual = period === "yearly" && paid;
        return (
          <Reveal key={p.id} delay={i * 0.05} className="plan-wrap">
            <article
              id={`plan-${p.id}`}
              className={`plan ${on ? "selected" : ""} ${p.popular ? "is-popular" : ""}`}
              role="radio"
              aria-checked={on}
              aria-label={p.name}
              tabIndex={on ? 0 : -1}
              onClick={() => onSelect(p.id)}
              onKeyDown={(e) => onKey(e, i)}
              onPointerMove={onSpotMove}
            >
              {p.popular && <span className="plan-flag" {...at("popularLabel")}>{s?.popularLabel || "Most popular"}</span>}
              <div className="plan-top">
                <h3 {...at(`plans.${i}.name`)}>{p.name}</h3>
                <span className="plan-radio" aria-hidden>
                  <Check />
                </span>
              </div>

              {/* annual compares with the real monthly price; monthly has no discount */}
              <div className="plan-was">
                {annual ? (
                  <>
                    <s>{usd(p.monthly!)}</s>
                    <span className="plan-off">{ANNUAL_SAVING}% off</span>
                  </>
                ) : null}
              </div>
              <div className="plan-price">
                {q.perMonth === null ? (
                  <span className="amount amount-text">Contact us</span>
                ) : q.perMonth === 0 ? (
                  <span className="amount">Free</span>
                ) : (
                  <>
                    <span className="amount" key={`${p.id}-${period}`} {...at(`plans.${i}.monthly`)}>{usd(q.perMonth)}</span>
                    <span className="per">/mo</span>
                  </>
                )}
              </div>
              <p className="plan-billed">
                {!paid
                  ? " "
                  : annual
                    ? <>{usd(q.charge!)} billed yearly · <span className="good">save {usd(q.yearlySaving)}</span></>
                    : `Billed monthly · ${usd(q.perYear!)} a year`}
              </p>

              <ul className="plan-specs" {...at(`plans.${i}.specs`)}>
                {p.specs.map((s) => (
                  <li key={s}>
                    <Icon value={s_?.specIcon} attrs={at("specIcon")} fallback={<Check {...at("specIcon")} />} />
                    {s}
                  </li>
                ))}
              </ul>

              {p.monthly === null ? (
                <a href={registerHref(p, period)} className={`gbtn ${on ? "gbtn-light" : ""} plan-cta`} {...at("contactLabel")}>
                  {s?.contactLabel || "Contact us"}
                </a>
              ) : (
                <a href={registerHref(p, period)} className={`gbtn ${on ? "gbtn-light" : ""} plan-cta`} {...at("ctaLabel")}>
                  {s?.ctaLabel || "Choose plan"}
                </a>
              )}
            </article>
          </Reveal>
        );
      })}
    </div>
  );
}

/** Plans as the CMS stores them (specs one per line, no price = "Contact us") become the shape the cards use. */
const toPlans = (s: Sec): Plan[] =>
  ((s.plans ?? []) as { name?: string; monthly?: number; popular?: boolean; specs?: string }[]).map((p, i) => ({
    id: slugify(p.name ?? "") || `plan-${i}`,
    name: p.name ?? "",
    monthly: typeof p.monthly === "number" ? p.monthly : null,
    popular: !!p.popular,
    specs: (p.specs ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
  }));

/** What the page shows when the CMS has nothing for it. The CMS "Pricing" page mirrors these. */
const defaults: Sec[] = [
  {
    _key: "hero", _type: "page-hero", title: "Plans that grow as your space", words: asWords(["takes shape", "connects", "scales"]),
    text: "Start free in a shared space, or move to your own private Morph Space when you're ready.",
  },
  {
    _key: "plans", _type: "plans", heading: "Choose your plan", annualSaving: ANNUAL_SAVING, specIcon: "",
    monthlyLabel: "Monthly", annualLabel: "Annual", popularLabel: "Most popular", ctaLabel: "Choose plan", contactLabel: "Contact us",
    plans: defaultPlans.map((p) => ({ name: p.name, monthly: p.monthly ?? undefined, popular: p.popular, specs: p.specs.join("\n") })),
  },
  {
    _key: "faq", _type: "faq", heading: "Questions about plans", light: true, items: faqs,
    note: "Can't find what you're looking for? Send us a message",
  },
  {
    _key: "cta", _type: "cta-band", heading: "Not sure which plan fits?", text: "Tell us what you need and we'll help you choose.",
    secondaryLabel: "Talk to us", secondaryUrl: "/contact",
  },
];

function Hero({ s }: { s: Sec }) {
  return (
    <Scene video short bgVideo={mediaUrl(s.backgroundVideo)} bgImage={mediaUrl(s.backgroundImage)} id="top" className="scene--hero">
      <h1 className="scene-title scene-title--hero fade-up" {...edit(s, "title")}>
        {s.title}
        <br />
        <RollText words={wordsOf(s.words, ["takes shape"])} />
      </h1>
      <p className="scene-sub fade-up" style={{ animationDelay: "0.3s" }} {...edit(s, "text")}>
        {s.text}
      </p>
    </Scene>
  );
}

function PlansSection({ s }: { s: Sec }) {
  if (typeof s.annualSaving === "number") setAnnualSaving(s.annualSaving);
  const plans = toPlans(s);
  const [period, setPeriod] = useState<Period>("monthly");
  const [picked, setPicked] = useState("");
  const selected = plans.some((p) => p.id === picked) ? picked : (plans.find((p) => p.popular) ?? plans[0])?.id ?? "";
  return (
    <section className="wrap wrap-plans mplans" id="plans">
      <div className="choose-row">
        <h2 {...edit(s, "heading")}>{s.heading}</h2>
        <div className="choose-billing">
          <BillingToggle value={period} onChange={setPeriod} s={s} />
        </div>
      </div>
      {/* the summary only sticks (on phones) while this block is on screen */}
      <div className="plans-area">
        <Plans plans={plans} period={period} selected={selected} onSelect={setPicked} s={s} />
      </div>
    </section>
  );
}

/** The FAQ note may end in "Send us a message"; those words become the link to the contact form. */
const faqNote = (note?: string): ReactNode => {
  const link = "Send us a message";
  if (!note) return undefined;
  const at = note.indexOf(link);
  if (at < 0) return note;
  return (
    <>
      {note.slice(0, at)}
      <a href="/contact#register">{link}</a>
      {note.slice(at + link.length)}
    </>
  );
};

export default function Pricing() {
  useHashScroll();
  const list = useSections(defaults);
  return (
    <main className="inner live">
      <Sections
        list={list}
        registry={{
          "page-hero": (s) => <Hero s={s} />,
          plans: (s) => <PlansSection s={s} />,
          faq: (s) => <Faq id="faq" title={s.heading} items={s.items ?? []} paper={!!s.light} note={faqNote(s.note)} editKey={s._key} />,
          "cta-band": (s) => <CtaBand s={s} />,
        }}
      />
    </main>
  );
}
