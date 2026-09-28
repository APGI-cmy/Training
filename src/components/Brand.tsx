import Image from "next/image";
import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand-link" href={href} aria-label="APGI Training home">
      <span className="brand-logo">
        <Image src="/branding/apgi-logo.png" alt="APGI — Assurance Protection Group Inc." width={256} height={114} priority />
      </span>
      <span className="brand-label">Training</span>
    </Link>
  );
}
