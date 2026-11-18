import {notFound} from 'next/navigation';
import {requestPreviewAccess} from '@/server/services/review-requests';
import {getUnitContent} from '@/lib/services/courses/get-unit-content';
import {ScannexTheoryAssessment} from '@/components/assessments/ScannexTheoryAssessment';
import {getScannexTheoryQuestions} from '@/server/assessments/scannex-theory-bank';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function Knowledge({params}:{params:Promise<{id:string;course:string;unit:string}>}){const {id,course,unit}=await params;try{await requestPreviewAccess(id,course);}catch{notFound();}const content=getUnitContent(course,unit);if(course!=='scannex-training-programme'||!content?.unit.practicalAssessment)notFound();return <main><Link href={`/review-requests/${id}/preview/${course}/${unit}`}>Back to review unit</Link><h1>Scannex knowledge assessment — review preview</h1><ScannexTheoryAssessment courseSlug={course} independentRequestId={id} questions={getScannexTheoryQuestions()} latestResult={null}/></main>;}
