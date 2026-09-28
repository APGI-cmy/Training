import Image from "next/image";
import Link from "next/link";
import type { CourseBranding } from "@/lib/branding";

export function Brand({ href = "/", branding }: { href?: string; branding?: CourseBranding | null }) {
  const brandName = branding?.brandName ?? "APGI";
  const label = branding ? "Training" : "Training";
  return (
    <Link className="brand-link" href={href} aria-label={`${brandName} Training home`}>
      <span className="brand-logo">
        {branding?.logoUrl ? (
          // A client logo is stored in the public branding bucket and changes at runtime.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt={branding.brandName} />
        ) : (
          <Image src="/branding/apgi-logo.png" alt="APGI — Assurance Protection Group Inc." width={256} height={114} priority />
        )}
      </span>
      <span className="brand-label">{label}</span>
    </Link>
  );
}
