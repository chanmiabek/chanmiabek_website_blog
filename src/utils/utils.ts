import path from "path";
import { getContentEntries } from "@/lib/database";

type Team = {
  name: string;
  role: string;
  avatar: string;
  linkedIn: string;
};

type Metadata = {
  title: string;
  subtitle?: string;
  publishedAt: string;
  summary: string;
  image?: string;
  images: string[];
  tag?: string;
  team: Team[];
  link?: string;
};

export async function getPosts(customPath = ["", "", "", ""]) {
  const normalizedPath = path.join(...customPath).replace(/\\/g, "/");

  if (normalizedPath.endsWith("src/app/blog/posts")) {
    return getContentEntries("blog");
  }

  if (normalizedPath.endsWith("src/app/work/projects")) {
    return getContentEntries("project");
  }

  return [];
}
