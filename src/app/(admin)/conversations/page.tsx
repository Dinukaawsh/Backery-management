import { Suspense } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

import ConversationsPage from "./ConversationsClient";

export default function ConversationsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      }
    >
      <ConversationsPage />
    </Suspense>
  );
}
