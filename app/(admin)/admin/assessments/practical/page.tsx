import { requireAdmin } from "@/lib/auth/require-admin";
import { PracticalAssessmentAdmin } from "@/components/admin/PracticalAssessmentAdmin";
export const dynamic = "force-dynamic";
export default async function PracticalAssessmentPage() { await requireAdmin(); return <main className="admin-page"><PracticalAssessmentAdmin /></main>; }
