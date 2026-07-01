import { cookies } from "next/headers";

const PROGRESS_COOKIE = "alp_completed_units";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type ProgressCookieState = Record<string, Record<string, string[]>>;

function parseProgressCookie(value?: string): ProgressCookieState {
  if (!value) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as ProgressCookieState;
  } catch {
    return {};
  }
}

export async function getCookieCompletedUnitIds({
  userId,
  courseId
}: {
  userId: string;
  courseId: string;
}): Promise<Set<string>> {
  const cookieStore = await cookies();
  const state = parseProgressCookie(cookieStore.get(PROGRESS_COOKIE)?.value);
  const unitIds = state[userId]?.[courseId];
  return new Set(Array.isArray(unitIds) ? unitIds : []);
}

export async function markCookieUnitCompleted({
  userId,
  courseId,
  unitId
}: {
  userId: string;
  courseId: string;
  unitId: string;
}) {
  const cookieStore = await cookies();
  const state = parseProgressCookie(cookieStore.get(PROGRESS_COOKIE)?.value);
  const userState = state[userId] ?? {};
  const unitIds = new Set(userState[courseId] ?? []);

  unitIds.add(unitId);
  userState[courseId] = Array.from(unitIds);
  state[userId] = userState;

  cookieStore.set(PROGRESS_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS
  });
}
