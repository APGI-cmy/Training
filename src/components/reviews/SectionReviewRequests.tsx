import {reviewRequestOptions} from '@/server/services/review-requests';
import {ReviewRequestDialog} from './ReviewRequestControls';
import type {ReviewKind} from '@/lib/review-requests';
export async function SectionReviewRequests({company,kind}:{company:string;kind:ReviewKind}){const options=await reviewRequestOptions(company);return <div className="button-row"><ReviewRequestDialog company={company} kind={kind} options={options}/><a href={`/review-requests?company=${company}&kind=${kind}`}>Open this section’s review requests</a></div>;}
