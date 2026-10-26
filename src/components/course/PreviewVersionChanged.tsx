import Link from "next/link";
export function PreviewVersionChanged({id}:{id:string}) {
  return <main className="page-shell"><h1>Review version changed</h1><p>The deployed course changed. Earlier evidence is retained. Johan or Jorrie must register the corrected deployment in Changes implemented before this review continues.</p><Link href={`/course-reviews/${id}#changes-implemented`}>Return to Changes implemented</Link></main>;
}
