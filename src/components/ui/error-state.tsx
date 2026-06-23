type ErrorStateProps = {
  title?: string;
  description?: string;
  reset?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description = "The learning portal could not finish this request. Please retry or return to the course list.",
  reset
}: ErrorStateProps) {
  return (
    <section className="state-card" role="alert">
      <h2>{title}</h2>
      <p>{description}</p>
      {reset ? (
        <div className="button-row">
          <button className="primary-button" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      ) : null}
    </section>
  );
}
