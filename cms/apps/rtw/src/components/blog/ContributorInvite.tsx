export function ContributorInvite() {
  return (
    <aside className="mt-14 border border-[var(--line)] bg-[var(--bg-elev)] px-5 py-6 md:px-6">
      <h2 className="font-serif text-[1.45rem] leading-tight text-[var(--ink)]">
        Are you a creator?
      </h2>
      <p className="mt-3 text-[16px] leading-7 text-[var(--ink)]">
        We are looking for authors that like to write about their tech ideas and are
        contributing to solving challenges in the world to make the world a better place
        for everyone. If you like to contribute and shape the world where humans and
        machines can live side by side, this is a good moment to join like-minded people
        and start building a community for the new humanity.
      </p>
      <p className="mt-3 text-[16px] leading-7 text-[var(--ink)]">
        If you want to be another writer here, or contribute an article, send it to both
        of us. We will review it. If it is published, you will be credited as the author.
        This site does not take ads, business pitches, or tool promotions. Those requests
        are refused.
      </p>
      <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px] tracking-[0.04em]">
        <a className="text-[var(--accent)]" href="mailto:thiru@synx.tools?cc=paal@synx.tools&subject=Article%20for%20Real%20Time%20Web">
          thiru@synx.tools
        </a>
        <a className="text-[var(--accent)]" href="mailto:paal@synx.tools?cc=thiru@synx.tools&subject=Article%20for%20Real%20Time%20Web">
          paal@synx.tools
        </a>
      </p>
    </aside>
  );
}
