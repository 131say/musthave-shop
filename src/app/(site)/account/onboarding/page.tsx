import { Suspense } from "react";
import OnboardingClient from "./ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OnboardingClient />
    </Suspense>
  );
}
