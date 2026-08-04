import { NextResponse } from "next/server";
import { loadRoles } from "@/lib/content/load";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const roles = await loadRoles();
    if (!roles.length) {
      return NextResponse.json({ error: "roles.csv has no rows" }, { status: 500 });
    }
    const index = Math.floor(Math.random() * roles.length);
    return NextResponse.json(roles[index]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
