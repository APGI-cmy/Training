// Served to both APGI surfaces; card design changes have one owner.
export const publicCatalogueStyle=`
.public-course-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px;align-items:stretch}
.public-course-card{min-width:0;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line,#c7d9e3);border-radius:12px;background:var(--surface,#fff);color:var(--ink,#0d2850);box-shadow:0 12px 32px rgba(13,40,80,.08)}
.public-course-cover{display:block;aspect-ratio:16/9;max-height:200px;overflow:hidden;background:linear-gradient(135deg,var(--brand-navy,#0d2850),var(--brand-blue,#006b92))}
.public-course-cover img{display:block;width:100%;height:100%;object-fit:cover}
.public-course-body{display:flex;flex:1;flex-direction:column;gap:12px;padding:20px}
.public-course-body h2,.public-course-body h3{font-size:1.2rem;line-height:1.3;margin:0;color:inherit}
.public-course-body p{margin:0;font-size:.95rem;line-height:1.55;color:var(--muted,#475e72)}
.public-course-level{font-size:.76rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--primary-strong,var(--brand-navy,#0d2850))}
.public-course-body .public-course-link{display:inline-flex;align-self:flex-start;align-items:center;min-height:44px;margin-top:auto;padding:10px 16px;background:var(--brand-blue,#006b92);border:2px solid var(--brand-blue,#006b92);border-radius:8px;color:#fff;font-weight:800;text-decoration:none}
.public-course-link:hover{background:var(--brand-navy,#0d2850);border-color:var(--brand-navy,#0d2850)}
.public-course-link:focus-visible{outline:3px solid var(--brand-mid-blue,#4c95b0);outline-offset:3px}
`;
