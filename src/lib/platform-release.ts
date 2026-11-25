import release from '@/data/platform-release.json';
// Registry consumed by both the application and the coordinated release tool.
export const PLATFORM_RELEASE=release;
export const PLATFORM_TEAM={id:release.teamId,slug:release.teamSlug};

export function platformSourceCommit(
  gitValue = process.env.VERCEL_GIT_COMMIT_SHA,
  buildValue: string | undefined = release.sourceCommit ?? undefined,
): string | null {
  const git = gitValue?.trim().toLowerCase();
  const build = buildValue?.trim().toLowerCase();
  const valid = (value: string | undefined): value is string => /^[0-9a-f]{40}$/.test(value ?? "");
  if (valid(build)) return valid(git) && git !== build ? null : build;
  return valid(git) ? git : null;
}
