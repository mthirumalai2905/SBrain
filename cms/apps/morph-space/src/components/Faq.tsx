import { useState, type ReactNode } from "react";
import { Reveal, SplitHeading } from "../lib/motion";

/**
 * Accordion used by the inner pages. `paper` sets it on the light paper sheet.
 * `editKey` is the CMS section's key, so clicking a question or answer in the CMS preview opens its field.
 */
export default function Faq({
  id = "faq",
  title = "FAQ",
  note,
  items,
  paper = false,
  editKey,
}: {
  id?: string;
  title?: string;
  note?: ReactNode;
  items: { q: string; a: string }[];
  paper?: boolean;
  editKey?: string;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const at = (field: string) => (editKey ? { "data-synx-edit": `${editKey}.${field}` } : {});
  return (
    <section className={paper ? "paper" : undefined} id={id}>
      <div className="wrap msection mfaq">
        <div className="mfaq-head">
          <SplitHeading text={title} className="mh2" edit={editKey ? `${editKey}.heading` : undefined} />
          {note && <p className="mfaq-note" {...at("note")}>{note}</p>}
        </div>
        <ol className="mfaq-list">
          {items.map((f, i) => (
            <Reveal as="li" key={i} delay={i * 0.04} className={`mfaq-item ${open === i ? "open" : ""}`}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                <span className="mfaq-q" {...at(`items.${i}.q`)}>{f.q}</span>
                <i aria-hidden />
              </button>
              <div className="mfaq-a">
                <div>
                  <p {...at(`items.${i}.a`)}>{f.a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
