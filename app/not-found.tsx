import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="content-band">
      <div className="content-inner">
        <EmptyState
          title="Learning page not found"
          description="The page you requested is not available in the APGI learning portal."
          action={
            <Link className="primary-button" href="/courses/vpshr-level-0">
              Return to Level 0
            </Link>
          }
        />
      </div>
    </main>
  );
}
