export const SCANNEX_COURSE_ID = "scannex-training-programme";
export const COPYRIGHT_TERMS_VERSION = "apgi-learner-ebook-20261118-v1";
export const COPYRIGHT_TERMS = "I acknowledge that the copyright in this book is owned by APGI. This copy is provided for my personal learning and reference. I may redistribute this book only with APGI's prior written consent. I must not sell, distribute or share this copy for commercial gain. By entering my full name and accepting below while signed in, I electronically acknowledge these terms.";

export function validBookId(value: unknown): value is string {
  return typeof value === "string" && /^(full|lu[1-9])$/.test(value);
}

export function normaliseSignature(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function validSignature(signature: unknown, expected: string): boolean {
  return typeof signature === "string" && signature.length >= 2 && signature.length <= 180
    && Boolean(expected.trim()) && normaliseSignature(signature) === normaliseSignature(expected);
}

export type CertificateKind = "attendance" | "passed";

export function certificateWording(kind: CertificateKind) {
  return kind === "passed"
    ? "has successfully met the requirements to pass the Scannex Training Programme."
    : "has attended the Scannex Training Programme. This certificate confirms attendance only; it does not certify a pass or operator competence.";
}

export function retryMessage(attemptNumber: number) {
  return attemptNumber === 1
    ? "You have not yet met the pass requirements. You have one included opportunity to revisit the course and try again. You may print your attendance certificate now and still take that redo."
    : "Thank you for the effort you have put into your learning. You have not yet met the pass requirements on this attempt. Your attendance certificate remains available. Please ask APGI to consider a discounted re-enrolment for your next attempt. You can continue this process with APGI's approval until you achieve a pass.";
}
