import { Suspense } from "react";
import LoginClient from "./ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
