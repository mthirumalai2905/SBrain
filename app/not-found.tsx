import Link from "next/link";

export default function NotFound() {
  return (
    <main className="gate">
      <div className="gate-inner" style={{ textAlign: "center" }}>
        <h1>Not Found</h1>
        <p className="lede">That page is not in Brain.</p>
        <Link href="/">Back to Brain</Link>
      </div>
    </main>
  );
}
