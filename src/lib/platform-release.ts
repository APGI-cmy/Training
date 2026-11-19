import release from '@/data/platform-release.json';
// Registry consumed by both the application and the coordinated release tool.
export const PLATFORM_RELEASE=release;
export const PLATFORM_TEAM={id:release.teamId,slug:release.teamSlug};
