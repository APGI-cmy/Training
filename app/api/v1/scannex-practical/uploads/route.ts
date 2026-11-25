import { actor, practicalError, requestBody, uploadMutation } from "@/server/services/practical-assignment";
export const maxDuration = 300;
export async function POST(r: Request) { try { const body = await requestBody(r); return Response.json(await uploadMutation(await actor(), body)); } catch (e) { return practicalError(e); } }
