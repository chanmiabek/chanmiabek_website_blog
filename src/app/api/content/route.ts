import { NextRequest, NextResponse } from "next/server";
import * as cookie from "cookie";
import { ContentMetadata, ContentType, saveContentEntry, getContentEntries } from "@/lib/database";

export const runtime = "nodejs";

type ContentPayload = {
  type: ContentType;
  slug?: string;
  originalSlug?: string;
  title?: string;
  subtitle?: string;
  publishedAt?: string;
  summary?: string;
  tag?: string;
  image?: string;
  images?: string[];
  link?: string;
  content?: string;
};

const defaultTeam = [
  {
    name: "Chan Miabek",
    role: "Software Developer",
    avatar: "/images/chan-profile.jpg",
    linkedIn: "https://www.linkedin.com/chanmiabek/",
  },
];

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

function assertContentType(type: string | null | undefined): asserts type is ContentType {
  if (type !== "blog" && type !== "project") {
    throw new Error("Invalid content type");
  }
}

function assertSlug(slug: string): asserts slug is string {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slugs can only contain lowercase letters, numbers, and hyphens");
  }
}

function buildData(payload: ContentPayload): ContentMetadata {
  const title = payload.title?.trim() || "Untitled";
  const publishedAt = payload.publishedAt?.trim() || new Date().toISOString().slice(0, 10);
  const summary = payload.summary?.trim() || "";

  if (payload.type === "blog") {
    return {
      title,
      subtitle: payload.subtitle?.trim() || "",
      publishedAt,
      summary,
      image: payload.image?.trim() || "/images/coding.jpg",
      images: [],
      tag: payload.tag?.trim() || "Blog",
      team: defaultTeam,
      link: "",
    };
  }

  return {
    title,
    publishedAt,
    summary,
    images: payload.images?.filter(Boolean) ?? ["/images/mywork.jpg"],
    team: defaultTeam,
    link: payload.link?.trim() || "",
  };
}

function writeEntry(payload: ContentPayload, mode: "create" | "update") {
  assertContentType(payload.type);

  const slug = slugify(payload.slug || payload.title || "");
  if (!slug) {
    throw new Error("A title or slug is required");
  }

  assertSlug(slug);

  const originalSlug = payload.originalSlug ? slugify(payload.originalSlug) : slug;
  assertSlug(originalSlug);

  const body = payload.content?.trim() || "Write your content here.";
  const metadata = buildData({ ...payload, slug });
  const entry = saveContentEntry(payload.type, slug, originalSlug, metadata, body, mode);

  if (!entry) {
    throw new Error("Unable to save content");
  }

  return entry;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const type = request.nextUrl.searchParams.get("type");
    assertContentType(type);

    return NextResponse.json({ entries: getContentEntries(type) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load content" },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as ContentPayload;
    const entry = writeEntry(payload, "create");

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create content" },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as ContentPayload;
    const entry = writeEntry(payload, "update");

    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update content" },
      { status: 400 },
    );
  }
}
