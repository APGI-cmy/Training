const courseCovers: Record<string, { src: string; alt: string }> = {
  "scannex-training-programme": {
    src: "/images/course-covers/scannex-cover.png",
    alt: "Security operator reviewing an X-ray image beside a modern screening station"
  },
  "vpshr-level-0": {
    src: "/images/course-covers/vpshr-cover.png",
    alt: "Security professionals reviewing a responsible conduct and human rights framework"
  }
};

export function getCourseCover(courseSlug: string) {
  return courseCovers[courseSlug] ?? null;
}
