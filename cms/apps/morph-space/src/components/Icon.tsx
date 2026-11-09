import type { ReactNode } from "react";
import { mediaUrl } from "../lib/cms";
import { ICON_BARS, ICON_PATHS, iconName } from "../lib/iconset";

/**
 * An icon chosen in the CMS: one from the built-in set ("icon:lock") or an uploaded image. With nothing chosen it
 * shows `fallback`, the icon the design ships with. `attrs` carries the click-to-edit marker.
 */
export default function Icon({
  value,
  size = 18,
  fallback,
  attrs,
}: {
  value?: string;
  size?: number;
  fallback?: ReactNode;
  attrs?: Record<string, string>;
}) {
  const name = iconName(value);
  if (name && ICON_BARS[name]) {
    const { bars, dx, dy, h } = ICON_BARS[name];
    return (
      <svg className="ui-icon" width={size} height={size} viewBox="0 0 40 40" fill="currentColor" aria-hidden {...attrs}>
        <g transform={`translate(${dx} ${dy})`}>
          {bars.map(([x, y, w], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx={h / 2} />
          ))}
        </g>
      </svg>
    );
  }
  if (name) {
    return (
      <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...attrs}>
        {ICON_PATHS[name].map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  }
  if (value) return <img className="ui-icon" src={mediaUrl(value)} alt="" width={size} height={size} style={{ objectFit: "contain" }} {...attrs} />;
  return <>{fallback}</>;
}
