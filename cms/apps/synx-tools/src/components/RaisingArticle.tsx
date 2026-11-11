import { Gloss } from "@/components/Gloss";
import { RobotNote } from "@/components/RobotNote";
import type { ArticleBlock, Mark } from "@/lib/article";

function renderMarked(text: string, marks: Mark[] = []) {
  const ranges = marks
    .map((mark) => {
      const start = text.indexOf(mark.find);
      return { ...mark, start, end: start + mark.find.length };
    })
    .sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) nodes.push(text.slice(cursor, range.start));
    const slice = text.slice(range.start, range.end);
    if (range.kind === "em") nodes.push(<em key={index}>{slice}</em>);
    else if (range.kind === "strong") nodes.push(<strong key={index}>{slice}</strong>);
    else if (range.kind === "u") nodes.push(<u key={index}>{slice}</u>);
    else nodes.push(<Gloss key={index} title={range.title ?? slice} hint={range.hint ?? ""}>{slice}</Gloss>);
    cursor = range.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function NewsEssay({ blocks }: { blocks: ArticleBlock[] }) {
  return blocks.map((block, index) => {
    if (block.type === "figure") {
      return (
        <figure className="news-figure" key={index}>
          <img src={block.src} alt={block.alt} />
        </figure>
      );
    }
    if (block.type === "note") {
      return (
        <RobotNote
          key={index}
          side={block.side}
          src={block.side === "right" ? "/img/robot-right.jpg" : "/img/robot-left.jpg"}
          lines={block.lines}
        />
      );
    }
    if (block.type === "h2") return <h2 key={index}>{block.text}</h2>;
    if (block.type === "h3") return <h3 key={index}>{block.text}</h3>;
    return (
      <p key={index} className={block.tone ? `news-${block.tone}` : undefined}>
        {renderMarked(block.text, block.marks)}
      </p>
    );
  });
}

