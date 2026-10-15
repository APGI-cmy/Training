import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getCurrentSession, getSupabaseRestUrl } from "@/server/auth/session";
import { requirePolicy } from "@/server/services/company-structure";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentSession()))
    return new NextResponse("Sign in required", { status: 401 });
  const { id } = await params;
  let policy;
  try {
    policy = (await requirePolicy(id)).policy;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!policy.file_path)
    return new NextResponse("No PDF filed", { status: 404 });
  const r = await fetch(
    getSupabaseRestUrl(
      `/storage/v1/object/authenticated/apgi-policy-documents/${policy.file_path}`,
    )!,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    },
  );
  if (!r.ok) return new NextResponse("Document unavailable", { status: 503 });
  const bytes = Buffer.from(await r.arrayBuffer());
  if (
    !policy.file_sha256 ||
    createHash("sha256").update(bytes).digest("hex") !== policy.file_sha256
  )
    return new NextResponse("Document integrity check failed", { status: 503 });
  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="APGI-policy-${id}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
