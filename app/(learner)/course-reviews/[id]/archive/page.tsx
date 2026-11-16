import {redirect} from 'next/navigation';
import {requireReviewRecord} from '@/server/services/course-reviews';
import {ArchivedReview} from '@/components/reviews/ArchivedReview';
import '../../reviews.css';
export const dynamic='force-dynamic';
export default async function ReviewArchive({params}:{params:Promise<{id:string}>}){
 const {id}=await params,{round,principal}=await requireReviewRecord(id);
 if(round.status!=='cancelled')redirect(`/course-reviews/${id}`);
 return <ArchivedReview round={round} principal={principal}/>;
}
