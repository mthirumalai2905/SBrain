import type { CSSProperties, ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
};

/** Same use as next/image for what this site needs: `fill` stretches the picture over its (positioned) parent. */
export default function Image({ src, alt, fill, priority, sizes: _sizes, width, height, className, style, ...rest }: Props) {
  const fillStyle: CSSProperties | undefined = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : undefined;
  return <img src={src} alt={alt} width={fill ? undefined : width} height={fill ? undefined : height} loading={priority ? "eager" : "lazy"} className={className} style={{ ...fillStyle, ...style }} {...rest} />;
}
