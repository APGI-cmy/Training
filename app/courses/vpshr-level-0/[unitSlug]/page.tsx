import type {Metadata} from 'next';
import {notFound,redirect} from 'next/navigation';
import {getUnitBySlug,getUnitStaticParams} from '@/lib/courses';
type Props={params:Promise<{unitSlug:string}>};
export function generateStaticParams(){return getUnitStaticParams();}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {unitSlug}=await params;const unit=getUnitBySlug(unitSlug);return {title:unit?.title??'Learning unit not found'};}
// Old bookmarks must use the same enrolled-edition and expiry gate as the
// current learner interface; never render a second public copy of the lesson.
export default async function LegacyLearningUnit({params}:Props){const {unitSlug}=await params;const unit=getUnitBySlug(unitSlug);if(!unit)notFound();redirect(`/learn/vpshr-level-0/units/${unit.slug}`);}