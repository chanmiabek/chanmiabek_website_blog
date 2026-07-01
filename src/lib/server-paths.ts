import path from "path";

export function getDatabasePath() {
  return (
    process.env.SQLITE_DATABASE_PATH ||
    path.join(/* turbopackIgnore: true */ process.cwd(), "data", "content.sqlite")
  );
}

export function getUploadDirectory() {
  return (
    process.env.UPLOAD_DIR ||
    path.join(/* turbopackIgnore: true */ process.cwd(), "public", "images", "uploads")
  );
}

export function getUploadPublicPath(fileName: string) {
  const publicPrefix = process.env.UPLOAD_PUBLIC_PATH || "/images/uploads";
  return `${publicPrefix.replace(/\/$/, "")}/${fileName}`;
}
