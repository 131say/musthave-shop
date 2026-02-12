export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ASSIST_SCENARIOS } from "@/lib/assistScenarios";

export async function GET() {
  return NextResponse.json({
    ok: true,
    scenarios: ASSIST_SCENARIOS,
  });
}
