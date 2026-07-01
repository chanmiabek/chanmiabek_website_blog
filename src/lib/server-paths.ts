import path from "path";

export function getDatabasePath() {
  return process.env.SQLITE_DATABASE_PATH || path.join(process.cwd(), "data", "content.sqlite");
}

export function getUploadDirectory() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "images", "uploads");
}

export function getUploadPublicPath(fileName: string) {
  const publicPrefix = process.env.UPLOAD_PUBLIC_PATH || "/images/uploads";
  return `${publicPrefix.replace(/\/$/, "")}/${fileName}`;
}
