import { Suspense } from "react";
import CabinetClient from "./ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CabinetClient />
    </Suspense>
  );
}
