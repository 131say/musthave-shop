import { Suspense } from "react";
import HomeClient from "./ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomeClient />
    </Suspense>
  );
}
