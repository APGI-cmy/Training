import Link from "next/link";

export function UnitResources({
  eBookHref,
  activityHref,
  activityAvailable,
  activityLabel = "Open learning activity in a full window"
}: {
  eBookHref: string;
  activityHref?: string;
  activityAvailable: boolean;
  activityLabel?: string;
}) {
  return (
    <section className="unit-resources" aria-labelledby="unit-resources-heading">
      <p className="eyebrow">Unit resources</p>
      <h2 id="unit-resources-heading">Read, then practise</h2>
      <p>
        The e-book remains available for reference while you complete the learning activity and quizzes.
      </p>
      <div className="button-row">
        <a className="secondary-button" href={eBookHref} target="_blank" rel="noreferrer">
          Open Scannex e-book
        </a>
        {activityAvailable && activityHref ? (
          <Link className="primary-button" href={activityHref}>
            {activityLabel}
          </Link>
        ) : activityAvailable ? (
          <span className="resource-status" role="status">
            Learning activity is open below. Use its own full-screen control for an expanded view.
          </span>
        ) : (
          <span className="resource-status" role="status">
            Learning activity will appear here once its SCORM package is verified.
          </span>
        )}
      </div>
    </section>
  );
}
