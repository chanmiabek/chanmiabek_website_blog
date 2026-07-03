import { NextRequest, NextResponse } from "next/server";
import * as cookie from "cookie";
import { GalleryImage, getGalleryImages, replaceGalleryImages } from "@/lib/database";

export const runtime = "nodejs";

function isAuthenticated(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookie.parse(cookieHeader);

  return cookies.authToken === "authenticated";
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ images: await getGalleryImages() });
}

export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const images: Partial<GalleryImage>[] = Array.isArray(body.images) ? body.images : [];

  const cleanImages = images.reduce<GalleryImage[]>((result, image) => {
    if (typeof image.src !== "string" || !image.src.trim()) {
      return result;
    }

    result.push({
      src: image.src.trim(),
      alt: typeof image.alt === "string" && image.alt.trim() ? image.alt.trim() : "Gallery image",
      orientation: image.orientation === "vertical" ? "vertical" : "horizontal",
    });

    return result;
  }, []);

  return NextResponse.json({ images: await replaceGalleryImages(cleanImages) });
}
