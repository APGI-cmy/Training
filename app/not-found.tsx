import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <section className="page-masthead">
        <div className="content-inner">
          <p className="eyebrow">Not found</p>
          <h1>That training page is not available</h1>
          <p>The VPSHR Level 0 course landing page has the current learning unit links.</p>
          <Link className="primary-button" href="/courses/vpshr-level-0">
            Open VPSHR Level 0
          </Link>
        </div>
      </section>
    </main>
  );
}
