import { actor, learnerMutation, learnerWorkspace, practicalError, requestBody } from "@/server/services/practical-assignment";
export async function GET() { try { return Response.json(await learnerWorkspace(await actor()), { headers: { "cache-control": "no-store" } }); } catch (e) { return practicalError(e); } }
export async function POST(r: Request) { try { const body = await requestBody(r); return Response.json(await learnerMutation(await actor(), body)); } catch (e) { return practicalError(e); } }
