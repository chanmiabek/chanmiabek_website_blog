import { NextResponse } from "next/server";
import { getDatabaseHealth } from "@/lib/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      ...getDatabaseHealth(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 },
    );
  }
}
