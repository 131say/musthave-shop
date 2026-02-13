import { Suspense } from "react";
import AdminLoginClient from "./ui";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminLoginClient />
    </Suspense>
  );
}
