import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  size?: number;
};

export function AuthorAvatar({ src, alt, size = 72 }: Props) {
  const inner = Math.round(size * 0.78);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-black"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={inner}
        height={inner}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
        style={{ width: inner, height: inner }}
      />
    </div>
  );
}
