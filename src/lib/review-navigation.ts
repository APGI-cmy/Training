export const commercialReviewPath = (id: string) => `/course-reviews/${id}/commercials`;
export const commercialSignoffAnchor = (email: string) => `commercial-signoff-${email.startsWith("johan.") ? "johan" : "jorrie"}`;
// Encode rather than strip punctuation, so distinct reviewer addresses keep distinct anchors.
export const commercialReviewerAnchor = (email: string) => `commercial-review-${Array.from(email.toLowerCase(), c => c.charCodeAt(0).toString(16).padStart(4,"0")).join("")}`;
export const reportAnchor = (id: string) => `report-${id}`;
