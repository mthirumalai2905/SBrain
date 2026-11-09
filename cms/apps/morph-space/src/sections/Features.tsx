import { features } from "../lib/content";
import { onSpotMove, Reveal, SplitHeading } from "../lib/motion";
import { featureIcons } from "./icons";

/** Six-card bento of what you get. The heading can be hidden when a page banner already says it. */
export default function Features({ heading = true }: { heading?: boolean }) {
  return (
    <section className="wrap section-tight" id="features">
      <div className="panel-box">
        {heading && (
          <div className="head">
            <Reveal>
              <p className="label">Features</p>
            </Reveal>
            <SplitHeading text="What you get with your own space." className="h2" dimFrom={4} />
          </div>
        )}
        <div className="bento">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.07} className={`spot ${[0, 3, 5].includes(i) ? "wide" : ""}`}>
              <div className="spot-inner" onPointerMove={onSpotMove}>
                <span className="feature-icon">{featureIcons[i]}</span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
