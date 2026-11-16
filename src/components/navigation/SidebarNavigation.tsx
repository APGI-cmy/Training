"use client";

import Link from "next/link";
import { Suspense,useEffect,useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {navigationGroups,currentNavigation,type NavigationItem} from "@/lib/navigation-groups";

function NavigationGroup({label,items,currentHref}:{label:string;items:NavigationItem[];currentHref?:string}) {
 const active=items.some(i=>i.href===currentHref),[open,setOpen]=useState(active);
 useEffect(()=>{if(active)setOpen(true);},[active,currentHref]);
 return <details className="sidebar-group" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary data-active={active}>{label}</summary><div className="sidebar-submenu">{items.map(i=><Link key={i.href} href={i.href} aria-current={i.href===currentHref?"page":undefined}>{i.label}</Link>)}</div></details>;
}

function NavigationLinks({ items, currentHref }: { items: NavigationItem[]; currentHref?: string }) {
  return <nav className="sidebar-links" aria-label="Learner route navigation">
    {items.filter(i=>i.href==="/dashboard").map(i=><Link key={i.href} href={i.href} aria-current={i.href===currentHref?"page":undefined}>{i.label}</Link>)}
    {navigationGroups(items).map(g=><NavigationGroup key={g.id} label={g.label} items={g.items} currentHref={currentHref}/>)}
    {items.filter(i=>i.href==="/profile").map(i=><Link key={i.href} href={i.href} aria-current={i.href===currentHref?"page":undefined}>{i.label}</Link>)}
  </nav>;
}

function CurrentNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  // The catalogue has two navigation entries distinguished by the view filter.
  const currentHref=currentNavigation(items,pathname,search.get("view"));
  return <NavigationLinks items={items} currentHref={currentHref} />;
}

export function SidebarNavigation({ items }: { items: NavigationItem[] }) {
  return <Suspense fallback={<NavigationLinks items={items} />}><CurrentNavigation items={items} /></Suspense>;
}
