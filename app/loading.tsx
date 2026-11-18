export default function Loading() {
  return (
    <main className="content-band">
      <div className="content-inner">
        <section className="state-card" aria-busy="true" aria-live="polite">
          <p className="eyebrow">Preparing</p>
          <h1>Loading your training workspace</h1>
          <p>The learning portal is preparing this screen.</p>
        </section>
      </div>
    </main>
  );
}
