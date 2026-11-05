import { NextResponse } from "next/server";
import { demoMode, liveLuzmo, openaiConfigured } from "@/lib/env";
import { CURRENT_USER } from "@/lib/crm/mock-accounts";

export async function GET() {
  return NextResponse.json({
    demoMode: demoMode(),
    liveLuzmo: liveLuzmo(),
    openaiConfigured: openaiConfigured(),
    currentUser: {
      name: CURRENT_USER.name,
      email: CURRENT_USER.email,
    },
  });
}
