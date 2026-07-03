import { NextRequest, NextResponse } from "next/server";
import * as cookie from "cookie";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;
  const submittedPassword = typeof password === "string" ? password.trim() : "";
  const correctPassword = process.env.PAGE_ACCESS_PASSWORD?.trim();

  if (!correctPassword) {
    console.error("PAGE_ACCESS_PASSWORD environment variable is not set");
    return NextResponse.json(
      { message: "PAGE_ACCESS_PASSWORD is not configured" },
      { status: 500 },
    );
  }

  if (submittedPassword === correctPassword) {
    const response = NextResponse.json({ success: true }, { status: 200 });

    response.headers.set(
      "Set-Cookie",
      cookie.serialize("authToken", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60,
        sameSite: "strict",
        path: "/",
      }),
    );

    return response;
  } else {
    return NextResponse.json({ message: "Incorrect password" }, { status: 401 });
  }
}
