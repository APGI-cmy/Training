"use client";

export default function UnitError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <section className="page-masthead">
        <div className="content-inner">
          <p className="eyebrow">Error</p>
          <h1>This learning unit did not load</h1>
          <p>Try again, or return to the course landing page.</p>
          <button className="primary-button" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
