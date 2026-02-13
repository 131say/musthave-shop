import { Suspense } from "react";
import AccountClient from "./AccountClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AccountClient />
    </Suspense>
  );
}
