import { Suspense } from "react";
import OTPClient from "./ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OTPClient />
    </Suspense>
  );
}
