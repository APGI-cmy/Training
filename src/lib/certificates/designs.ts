export const certificateDesigns = [
  { id: "classic", name: "Classic frame", description: "A formal double border with a centred presentation." },
  { id: "executive", name: "Executive", description: "A strong side panel and restrained organisation colours." },
  { id: "modern", name: "Modern", description: "Clean asymmetric corner blocks and open space." },
  { id: "ribbon", name: "Ribbon", description: "An accent ribbon and a fine surrounding frame." },
  { id: "minimal", name: "Minimal", description: "A simple top rule and generous white space." },
  { id: "heritage", name: "Heritage", description: "Ornamental corners with an understated formal border." },
  { id: "geometric", name: "Geometric", description: "Angular corner details and a contemporary frame." },
  { id: "academy", name: "Academy", description: "A scholarly frame with a small decorative seal." },
  { id: "prestige", name: "Prestige", description: "Layered borders with a subtle accent medallion." },
  { id: "horizon", name: "Horizon", description: "A calm lower band with a contrasting fine rule." }
] as const;
export type CertificateDesignId = typeof certificateDesigns[number]["id"];
export type CertificateSnapshot = { name: string; course: string; organisation: string; templateId: CertificateDesignId; primary: string; secondary: string; accent: string; logoPath: string | null; test: boolean; statement: string };
export type CertificateRecord = { id: string; certificate_number: string; user_id: string; course_id: string; organisation_id: string; issued_at: string; snapshot: CertificateSnapshot; signature: string; status: "valid" | "revoked" };
export type Decoration = { x: number; y: number; w: number; h: number; color: string; stroke?: boolean; radius?: number };
export function isDesign(value: string): value is CertificateDesignId { return certificateDesigns.some(d => d.id === value); }
export function safeColor(value: string, fallback = "#10314f") { return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback; }
export function frame(s: CertificateSnapshot): Decoration[] {
  const p = safeColor(s.primary), a = safeColor(s.accent, "#9c7b30"), b = safeColor(s.secondary, "#0785a6");
  const border: Decoration = { x: 24, y: 24, w: 794, h: 547, color: p, stroke: true };
  switch (s.templateId) {
    case "classic": return [border,{x:32,y:32,w:778,h:531,color:a,stroke:true}];
    case "executive": return [{x:0,y:0,w:35,h:595,color:p},{x:35,y:0,w:6,h:595,color:a},{x:64,y:541,w:682,h:2,color:p}];
    case "modern": return [{x:0,y:0,w:170,h:18,color:p},{x:0,y:0,w:18,h:155,color:p},{x:742,y:20,w:80,h:8,color:a},{x:810,y:20,w:12,h:110,color:a},{x:70,y:536,w:705,h:3,color:b}];
    case "ribbon": return [border,{x:772,y:24,w:24,h:170,color:a},{x:750,y:24,w:12,h:135,color:b}];
    case "minimal": return [{x:82,y:35,w:680,h:3,color:a},{x:82,y:540,w:680,h:1,color:p}];
    case "heritage": return [border,...[28,794].flatMap(x=>[28,543].map(y=>({x,y,w:20,h:20,color:a,radius:10}))),{x:40,y:40,w:762,h:515,color:a,stroke:true}];
    case "geometric": return [border,{x:24,y:24,w:80,h:15,color:b},{x:24,y:24,w:15,h:90,color:b},{x:738,y:556,w:80,h:15,color:a},{x:803,y:481,w:15,h:90,color:a}];
    case "academy": return [{x:20,y:20,w:802,h:555,color:p,stroke:true},{x:29,y:29,w:784,h:537,color:a,stroke:true},{x:100,y:397,w:76,h:76,color:a,radius:38}];
    case "prestige": return [border,{x:29,y:29,w:784,h:537,color:a,stroke:true},{x:34,y:34,w:774,h:527,color:p,stroke:true},{x:108,y:405,w:60,h:60,color:a,radius:30}];
    case "horizon": return [{x:0,y:546,w:842,h:49,color:p},{x:0,y:535,w:842,h:6,color:b},{x:60,y:530,w:722,h:2,color:a}];
  }
}
