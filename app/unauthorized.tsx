import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function Unauthorized() {
  return (
    <main className="content-band">
      <div className="content-inner">
        <EmptyState
          title="Access not available"
          description="This learning area requires an authorized APGI learner, reviewer, or admin session."
          action={
            <Link className="primary-button" href="/courses/vpshr-level-0">
              Return to course
            </Link>
          }
        />
      </div>
    </main>
  );
}
