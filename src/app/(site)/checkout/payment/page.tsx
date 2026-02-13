import { Suspense } from "react";
import PaymentClient from "./ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaymentClient />
    </Suspense>
  );
}
