import { actor, downloadFile, practicalError } from "@/server/services/practical-assignment";
export async function GET(_r: Request, { params }: { params: Promise<{ fileId: string }> }) { try { const { fileId } = await params; return await downloadFile(await actor(), fileId); } catch (e) { return practicalError(e); } }
