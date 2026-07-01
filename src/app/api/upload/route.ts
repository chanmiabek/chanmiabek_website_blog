import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import * as cookie from "cookie";
import { getUploadDirectory, getUploadPublicPath } from "@/lib/server-paths";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function isAuthenticated(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookie.parse(cookieHeader);

  return cookies.authToken === "authenticated";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getExtension(file: File) {
  const fromName = path.extname(file.name).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(fromName)) {
    return fromName === ".jpeg" ? ".jpg" : fromName;
  }

  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";

  return ".jpg";
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);

  if (!files.length) {
    return NextResponse.json({ message: "No image files were uploaded" }, { status: 400 });
  }

  const uploadDir = getUploadDirectory();
  fs.mkdirSync(uploadDir, { recursive: true });

  const uploaded: string[] = [];

  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { message: `${file.name} is not a supported image type` },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const baseName = slugify(path.basename(file.name, path.extname(file.name))) || "image";
    const fileName = `${Date.now()}-${baseName}${getExtension(file)}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, bytes);
    uploaded.push(getUploadPublicPath(fileName));
  }

  return NextResponse.json({ uploaded });
}
