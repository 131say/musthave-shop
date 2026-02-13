import { Suspense } from "react";
import RegisterClient from "./ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterClient />
    </Suspense>
  );
}
