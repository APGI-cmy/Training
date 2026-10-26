import Link from "next/link";
import { ScannexTheoryAssessment } from "@/components/assessments/ScannexTheoryAssessment";
import { getScannexTheoryQuestions } from "@/server/assessments/scannex-theory-bank";
export function PreviewKnowledge({courseSlug,returnHref,reviewId}:{courseSlug:string;returnHref:string;reviewId?:string}) {
  return <main><section className="unit-masthead"><div className="content-inner"><Link className="back-link" href={returnHref}>Back to summative assessment</Link><p className="eyebrow">Summative assessment</p><h1>Scannex Knowledge Assessment</h1><p>Part A of the final assessment assesses the theory and decision knowledge from the Scannex programme.</p><div className="unit-meta"><span>68 theory marks</span><span>32 practical marks</span><span>75% overall pass requirement</span></div></div></section><ScannexTheoryAssessment courseSlug={courseSlug} reviewId={reviewId} adminPreview={!reviewId} questions={getScannexTheoryQuestions()} latestResult={null}/></main>;
}
