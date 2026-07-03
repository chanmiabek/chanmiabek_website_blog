import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { createClient, type Client } from "@libsql/client";
import matter from "gray-matter";

import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { attachDatabasePool } from "@vercel/functions";
import { Signer } from "@aws-sdk/rds-signer";
import process from "process";

type PgPool = any;
type ClientBase = any;

export type ContentType = "blog" | "project";

export type TeamMember = {
  name: string;
  role: string;
  avatar: string;
  linkedIn: string;
};

export type ContentMetadata = {
  title: string;
  subtitle?: string;
  publishedAt: string;
  summary: string;
  image?: string;
  images: string[];
  tag?: string;
  team: TeamMember[];
  link?: string;
};

export type ContentEntry = {
  slug: string;
  metadata: ContentMetadata;
  content: string;
};

export type GalleryImage = {
  src: string;
  alt: string;
  orientation: "horizontal" | "vertical";
};

const contentDirectories: Record<ContentType, string> = {
  blog: path.join(/* turbopackIgnore: true */ process.cwd(), "src", "app", "blog", "posts"),
  project: path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "src",
    "app",
    "work",
    "projects",
  ),
};

const defaultTeam: TeamMember[] = [
  {
    name: "Chan Miabek",
    role: "Software Developer",
    avatar: "/images/chan-profile.jpg",
    linkedIn: "https://www.linkedin.com/chanmiabek/",
  },
];

let client: Client | null = null;
let initialized: Promise<void> | null = null;
let pool: Pool | null = null;

function hasDatabaseConfig() {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

function getEnvVar(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function getClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  client = createClient({ url, authToken });
  return client;
}

async function migrate(db: Client) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS content_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('blog', 'project')),
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      published_at TEXT NOT NULL,
      summary TEXT NOT NULL,
      image TEXT,
      images TEXT NOT NULL DEFAULT '[]',
      tag TEXT,
      team TEXT NOT NULL DEFAULT '[]',
      link TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, slug)
    );

    CREATE TABLE IF NOT EXISTS gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      src TEXT NOT NULL UNIQUE,
      alt TEXT NOT NULL,
      orientation TEXT NOT NULL DEFAULT 'horizontal',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function buildMetadata(type: ContentType, data: Record<string, any>): ContentMetadata {
  const shared = {
    title: data.title || "",
    publishedAt: data.publishedAt || new Date().toISOString().slice(0, 10),
    summary: data.summary || "",
    team: Array.isArray(data.team) && data.team.length ? data.team : defaultTeam,
    link: data.link || "",
  };

  if (type === "blog") {
    return {
      ...shared,
      subtitle: data.subtitle || "",
      image: data.image || "/images/coding.jpg",
      images: [],
      tag: data.tag || "Blog",
    };
  }

  return {
    ...shared,
    subtitle: data.subtitle || "",
    image: data.image || "",
    images: Array.isArray(data.images) && data.images.length ? data.images : ["/images/mywork.jpg"],
    tag: data.tag || "",
  };
}

function getGallerySeedPath() {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "src",
    "resources",
    "gallery-images.json",
  );
}

function getFileContentEntries(type: ContentType): ContentEntry[] {
  const directory = contentDirectories[type];
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .filter((file) => path.extname(file) === ".mdx")
    .map((file) => {
      const raw = fs.readFileSync(path.join(directory, file), "utf-8");
      const parsed = matter(raw);

      return {
        slug: path.basename(file, ".mdx"),
        metadata: buildMetadata(type, parsed.data),
        content: parsed.content.trim(),
      };
    })
    .sort((a, b) => {
      return (
        new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime()
      );
    });
}

function getSeedGalleryImages(): GalleryImage[] {
  const galleryPath = getGallerySeedPath();
  if (!fs.existsSync(galleryPath)) return [];

  const images = JSON.parse(fs.readFileSync(galleryPath, "utf-8")) as Partial<GalleryImage>[];

  return images.reduce<GalleryImage[]>((result, image) => {
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
}

async function seedDatabase(db: Client) {
  const contentCount = await db.execute("SELECT COUNT(*) as count FROM content_entries");
  const existingContentCount = Number(contentCount.rows[0]?.count ?? 0);

  if (existingContentCount === 0) {
    const statements: Parameters<Client["batch"]>[0] = [];

    (Object.keys(contentDirectories) as ContentType[]).forEach((type) => {
      const directory = contentDirectories[type];
      if (!fs.existsSync(directory)) return;

      fs.readdirSync(directory)
        .filter((file) => path.extname(file) === ".mdx")
        .forEach((file) => {
          const raw = fs.readFileSync(path.join(directory, file), "utf-8");
          const parsed = matter(raw);
          const data = buildMetadata(type, parsed.data);

          statements.push({
            sql: `
              INSERT INTO content_entries (
                type, slug, title, subtitle, published_at, summary, image, images, tag, team, link, content
              ) VALUES (
                @type, @slug, @title, @subtitle, @publishedAt, @summary, @image, @images, @tag, @team, @link, @content
              )
            `,
            args: {
              type,
              slug: path.basename(file, ".mdx"),
              title: data.title,
              subtitle: data.subtitle ?? null,
              publishedAt: data.publishedAt,
              summary: data.summary,
              image: data.image ?? null,
              images: JSON.stringify(data.images),
              tag: data.tag ?? null,
              team: JSON.stringify(data.team),
              link: data.link ?? null,
              content: parsed.content.trim(),
            },
          });
        });
    });

    if (statements.length > 0) {
      await db.batch(statements, "write");
    }
  }

  const galleryCount = await db.execute("SELECT COUNT(*) as count FROM gallery_images");
  const existingGalleryCount = Number(galleryCount.rows[0]?.count ?? 0);

  if (existingGalleryCount === 0) {
    const galleryPath = getGallerySeedPath();
    if (!fs.existsSync(galleryPath)) return;

    const images = JSON.parse(fs.readFileSync(galleryPath, "utf-8")) as Partial<GalleryImage>[];
    const statements = images
      .filter((image): image is Partial<GalleryImage> & { src: string } => {
        return typeof image.src === "string" && image.src.trim().length > 0;
      })
      .map((image, index) => ({
        sql: `
          INSERT INTO gallery_images (src, alt, orientation, sort_order)
          VALUES (@src, @alt, @orientation, @sortOrder)
        `,
        args: {
          src: image.src.trim(),
          alt: typeof image.alt === "string" && image.alt.trim() ? image.alt.trim() : "Gallery image",
          orientation: image.orientation === "vertical" ? "vertical" : "horizontal",
          sortOrder: index,
        },
      }));

    if (statements.length > 0) {
      await db.batch(statements, "write");
    }
  }
}

async function ensureDatabase(): Promise<Client> {
  const db = getClient();
  if (!initialized) {
    initialized = (async () => {
      await migrate(db);
      await seedDatabase(db);
    })();
  }
  await initialized;
  return db;
}

export async function getDatabaseHealth() {
  if (!hasDatabaseConfig()) {
    return {
      contentEntries: getFileContentEntries("blog").length + getFileContentEntries("project").length,
      galleryImages: getSeedGalleryImages().length,
    };
  }

  const db = await ensureDatabase();
  const content = await db.execute("SELECT COUNT(*) as count FROM content_entries");
  const gallery = await db.execute("SELECT COUNT(*) as count FROM gallery_images");

  return {
    contentEntries: Number(content.rows[0]?.count ?? 0),
    galleryImages: Number(gallery.rows[0]?.count ?? 0),
  };
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToEntry(row: any): ContentEntry {
  return {
    slug: row.slug,
    metadata: {
      title: row.title,
      subtitle: row.subtitle || "",
      publishedAt: row.published_at,
      summary: row.summary,
      image: row.image || "",
      images: parseJson<string[]>(row.images, []),
      tag: row.tag || "",
      team: parseJson<TeamMember[]>(row.team, defaultTeam),
      link: row.link || "",
    },
    content: row.content,
  };
}

export async function getContentEntries(type: ContentType) {
  if (!hasDatabaseConfig()) {
    return getFileContentEntries(type);
  }

  const db = await ensureDatabase();
  const result = await db.execute({
    sql: `
      SELECT slug, title, subtitle, published_at, summary, image, images, tag, team, link, content
      FROM content_entries
      WHERE type = ?
      ORDER BY date(published_at) DESC, updated_at DESC
    `,
    args: [type],
  });

  return result.rows.map(rowToEntry);
}

export async function saveContentEntry(
  type: ContentType,
  slug: string,
  originalSlug: string,
  metadata: ContentMetadata,
  content: string,
  mode: "create" | "update",
) {
  const db = await ensureDatabase();

  const existingResult = await db.execute({
    sql: "SELECT slug FROM content_entries WHERE type = ? AND slug = ?",
    args: [type, slug],
  });
  const existing = existingResult.rows.length > 0;

  if (mode === "create" && existing) {
    throw new Error("An entry with this slug already exists");
  }

  if (mode === "update" && originalSlug !== slug && existing) {
    throw new Error("An entry with the new slug already exists");
  }

  const args = {
    type,
    originalSlug,
    slug,
    title: metadata.title,
    subtitle: metadata.subtitle ?? null,
    publishedAt: metadata.publishedAt,
    summary: metadata.summary,
    image: metadata.image ?? null,
    images: JSON.stringify(metadata.images),
    tag: metadata.tag ?? null,
    team: JSON.stringify(metadata.team),
    link: metadata.link ?? null,
    content,
  };

  if (mode === "update") {
    const result = await db.execute({
      sql: `
        UPDATE content_entries
        SET slug = @slug,
            title = @title,
            subtitle = @subtitle,
            published_at = @publishedAt,
            summary = @summary,
            image = @image,
            images = @images,
            tag = @tag,
            team = @team,
            link = @link,
            content = @content,
            updated_at = CURRENT_TIMESTAMP
        WHERE type = @type AND slug = @originalSlug
      `,
      args,
    });

    if (result.rowsAffected === 0) {
      throw new Error("Entry not found");
    }
  } else {
    await db.execute({
      sql: `
        INSERT INTO content_entries (
          type, slug, title, subtitle, published_at, summary, image, images, tag, team, link, content
        ) VALUES (
          @type, @slug, @title, @subtitle, @publishedAt, @summary, @image, @images, @tag, @team, @link, @content
        )
      `,
      args,
    });
  }

  const entries = await getContentEntries(type);
  return entries.find((entry) => entry.slug === slug);
}

export async function getGalleryImages(): Promise<GalleryImage[]> {
  if (!hasDatabaseConfig()) {
    return getSeedGalleryImages();
  }

  const db = await ensureDatabase();
  const result = await db.execute(`
    SELECT src, alt, orientation, sort_order
    FROM gallery_images
    ORDER BY sort_order ASC, id ASC
  `);

  return result.rows.map((row: any) => ({
    src: row.src,
    alt: row.alt,
    orientation: row.orientation === "vertical" ? "vertical" : "horizontal",
  }));
}

export async function replaceGalleryImages(images: GalleryImage[]) {
  const db = await ensureDatabase();

  const statements = [
    { sql: "DELETE FROM gallery_images", args: [] as unknown[] },
    ...images.map((image, index) => ({
      sql: `
        INSERT INTO gallery_images (src, alt, orientation, sort_order)
        VALUES (@src, @alt, @orientation, @sortOrder)
      `,
      args: {
        src: image.src,
        alt: image.alt,
        orientation: image.orientation,
        sortOrder: index,
      },
    })),
  ];

  await db.batch(statements as any, "write");
  return getGalleryImages();
}

// Database functions


export async function getSigner() {
  return new Signer({
    hostname: getEnvVar("PGHOST"),
    port: Number(getEnvVar("PGPORT")),
    username: getEnvVar("PGUSER"),
    region: getEnvVar("AWS_REGION"),
    credentials: awsCredentialsProvider({
      roleArn: getEnvVar("AWS_ROLE_ARN"),
      clientConfig: { region: getEnvVar("AWS_REGION") },
    }),
  });
}

export async function getDatabasePool() {
  if (pool) return pool;

  const signer = await getSigner();
  pool = new Pool({
    host: getEnvVar("PGHOST"),
    user: getEnvVar("PGUSER"),
    database: process.env.PGDATABASE || "postgres",
    // The auth token value can be cached for up to 15 minutes (900 seconds) if desired.
    password: () => signer.getAuthToken(),
    port: Number(getEnvVar("PGPORT")),
    // Recommended to switch to `true` in production.
    // See https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html#rds-lambda-certificates
    ssl: { rejectUnauthorized: false },
    max: 20,
  });
  attachDatabasePool(pool);
  return pool;
}


// Single query transaction.
export async function query(sql: string, args: unknown[]) {
  const db = await getDatabasePool();
  return db.query(sql, args);
}

// Use it for multiple queries transaction.
export async function withConnection<T>(
  fn: (client: ClientBase) => Promise<T>,
): Promise<T> {
  const db = await getDatabasePool();
  const client = await db.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}