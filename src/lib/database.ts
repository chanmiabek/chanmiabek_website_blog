import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import matter from "gray-matter";
import { getDatabasePath } from "./server-paths";

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

type ContentRow = {
  slug: string;
  title: string;
  subtitle: string | null;
  published_at: string;
  summary: string;
  image: string | null;
  images: string;
  tag: string | null;
  team: string;
  link: string | null;
  content: string;
};

type GalleryRow = GalleryImage & {
  sort_order: number;
};

const contentDirectories: Record<ContentType, string[]> = {
  blog: ["src", "app", "blog", "posts"],
  project: ["src", "app", "work", "projects"],
};

const defaultTeam: TeamMember[] = [
  {
    name: "Chan Miabek",
    role: "Software Developer",
    avatar: "/images/chan-profile.jpg",
    linkedIn: "https://www.linkedin.com/chanmiabek/",
  },
];

let database: Database.Database | null = null;

function getDatabase() {
  if (database) return database;

  const databasePath = getDatabasePath();
  const databaseDirectory = path.dirname(databasePath);

  fs.mkdirSync(databaseDirectory, { recursive: true });
  database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  migrate(database);
  seedDatabase(database);

  return database;
}

export function getDatabaseHealth() {
  const db = getDatabase();
  const content = db.prepare("SELECT COUNT(*) as count FROM content_entries").get() as {
    count: number;
  };
  const gallery = db.prepare("SELECT COUNT(*) as count FROM gallery_images").get() as {
    count: number;
  };

  return {
    databasePath: getDatabasePath(),
    contentEntries: content.count,
    galleryImages: gallery.count,
  };
}

function migrate(db: Database.Database) {
  db.exec(`
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

function seedDatabase(db: Database.Database) {
  const contentCount = db.prepare("SELECT COUNT(*) as count FROM content_entries").get() as {
    count: number;
  };

  if (contentCount.count === 0) {
    const insert = db.prepare(`
      INSERT INTO content_entries (
        type, slug, title, subtitle, published_at, summary, image, images, tag, team, link, content
      ) VALUES (
        @type, @slug, @title, @subtitle, @publishedAt, @summary, @image, @images, @tag, @team, @link, @content
      )
    `);

    const seedContent = db.transaction(() => {
      (Object.keys(contentDirectories) as ContentType[]).forEach((type) => {
        const directory = path.join(process.cwd(), ...contentDirectories[type]);
        if (!fs.existsSync(directory)) return;

        fs.readdirSync(directory)
          .filter((file) => path.extname(file) === ".mdx")
          .forEach((file) => {
            const raw = fs.readFileSync(path.join(directory, file), "utf-8");
            const parsed = matter(raw);
            const data = buildMetadata(type, parsed.data);

            insert.run({
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
            });
          });
      });
    });

    seedContent();
  }

  const galleryCount = db.prepare("SELECT COUNT(*) as count FROM gallery_images").get() as {
    count: number;
  };

  if (galleryCount.count === 0) {
    const galleryPath = path.join(process.cwd(), "src", "resources", "gallery-images.json");
    if (!fs.existsSync(galleryPath)) return;

    const images = JSON.parse(fs.readFileSync(galleryPath, "utf-8")) as Partial<GalleryImage>[];
    const insert = db.prepare(`
      INSERT INTO gallery_images (src, alt, orientation, sort_order)
      VALUES (@src, @alt, @orientation, @sortOrder)
    `);

    const seedGallery = db.transaction(() => {
      images.forEach((image, index) => {
        if (typeof image.src !== "string" || !image.src.trim()) return;

        insert.run({
          src: image.src.trim(),
          alt: typeof image.alt === "string" && image.alt.trim() ? image.alt.trim() : "Gallery image",
          orientation: image.orientation === "vertical" ? "vertical" : "horizontal",
          sortOrder: index,
        });
      });
    });

    seedGallery();
  }
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

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToEntry(row: ContentRow): ContentEntry {
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

export function getContentEntries(type: ContentType) {
  const rows = getDatabase()
    .prepare(
      `
      SELECT slug, title, subtitle, published_at, summary, image, images, tag, team, link, content
      FROM content_entries
      WHERE type = ?
      ORDER BY date(published_at) DESC, updated_at DESC
    `,
    )
    .all(type) as ContentRow[];

  return rows.map(rowToEntry);
}

export function saveContentEntry(
  type: ContentType,
  slug: string,
  originalSlug: string,
  metadata: ContentMetadata,
  content: string,
  mode: "create" | "update",
) {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT slug FROM content_entries WHERE type = ? AND slug = ?")
    .get(type, slug);

  if (mode === "create" && existing) {
    throw new Error("An entry with this slug already exists");
  }

  if (mode === "update" && originalSlug !== slug && existing) {
    throw new Error("An entry with the new slug already exists");
  }

  if (mode === "update") {
    const result = db
      .prepare(
        `
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
      )
      .run({
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
      });

    if (result.changes === 0) {
      throw new Error("Entry not found");
    }
  } else {
    db.prepare(
      `
      INSERT INTO content_entries (
        type, slug, title, subtitle, published_at, summary, image, images, tag, team, link, content
      ) VALUES (
        @type, @slug, @title, @subtitle, @publishedAt, @summary, @image, @images, @tag, @team, @link, @content
      )
    `,
    ).run({
      type,
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
    });
  }

  return getContentEntries(type).find((entry) => entry.slug === slug);
}

export function getGalleryImages(): GalleryImage[] {
  const rows = getDatabase()
    .prepare(
      `
      SELECT src, alt, orientation, sort_order
      FROM gallery_images
      ORDER BY sort_order ASC, id ASC
    `,
    )
    .all() as GalleryRow[];

  return rows.map((row) => ({
    src: row.src,
    alt: row.alt,
    orientation: row.orientation === "vertical" ? "vertical" : "horizontal",
  }));
}

export function replaceGalleryImages(images: GalleryImage[]) {
  const db = getDatabase();
  const replace = db.transaction(() => {
    db.prepare("DELETE FROM gallery_images").run();

    const insert = db.prepare(`
      INSERT INTO gallery_images (src, alt, orientation, sort_order)
      VALUES (@src, @alt, @orientation, @sortOrder)
    `);

    images.forEach((image, index) => {
      insert.run({
        src: image.src,
        alt: image.alt,
        orientation: image.orientation,
        sortOrder: index,
      });
    });
  });

  replace();
  return getGalleryImages();
}
