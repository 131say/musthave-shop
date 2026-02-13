import { Suspense } from "react";
import SuccessClient from "./ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SuccessClient />
    </Suspense>
  );
}
