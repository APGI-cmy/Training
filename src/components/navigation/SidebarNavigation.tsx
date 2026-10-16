"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type NavigationItem = { href: string; label: string };

function NavigationLinks({ items, currentHref }: { items: NavigationItem[]; currentHref?: string }) {
  return <nav className="sidebar-links" aria-label="Learner route navigation">
    {items.map(({ href, label }) => <Link key={href} href={href} aria-current={href === currentHref ? "page" : undefined}>{label}</Link>)}
  </nav>;
}

function CurrentNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  // The catalogue has two navigation entries distinguished by the view filter.
  const currentHref = pathname === "/catalogue"
    ? search.get("view") === "my-learning" ? "/catalogue?view=my-learning" : "/catalogue"
    : items.filter(({ href }) => !href.includes("?") &&
        (pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`))))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return <NavigationLinks items={items} currentHref={currentHref} />;
}

export function SidebarNavigation({ items }: { items: NavigationItem[] }) {
  return <Suspense fallback={<NavigationLinks items={items} />}><CurrentNavigation items={items} /></Suspense>;
}
