import {SectionReviewRequests} from '@/components/reviews/SectionReviewRequests';
import {notFound} from 'next/navigation';
import {requireSession} from '@/server/auth/session';
import {productionCompanyId} from '@/server/services/tenant-courses';
import {accessibleCompanies,contextualCompany,requireCompany} from '@/server/services/company-structure';
import {CompanyBrandForm} from '@/components/admin/CompanyBrandForm';

export default async function CompanyBrandingPage(){
 const session=await requireSession();
 const selected=productionCompanyId()??(await contextualCompany(session))?.id??(await accessibleCompanies(session,true))[0]?.id;
 if(!selected)notFound();
 const {company}=await requireCompany(selected);
 return <main className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">{company.name}</p><h1>Company branding</h1><p>Manage your logo, colours, watermarks and certificate design.</p></div></header><SectionReviewRequests company={company.id} kind="branding"/><CompanyBrandForm company={company}/></main>;
}
