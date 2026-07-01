"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Column, Heading, Input, Row, Text } from "@once-ui-system/core";

type ContentType = "blog" | "project" | "gallery";

type Entry = {
  slug: string;
  metadata: Record<string, any>;
  content: string;
};

type GalleryImage = {
  src: string;
  alt: string;
  orientation: "horizontal" | "vertical";
};

type FormState = {
  originalSlug: string;
  slug: string;
  title: string;
  subtitle: string;
  publishedAt: string;
  summary: string;
  tag: string;
  image: string;
  images: string;
  link: string;
  content: string;
};

const emptyForm: FormState = {
  originalSlug: "",
  slug: "",
  title: "",
  subtitle: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  summary: "",
  tag: "Blog",
  image: "/images/coding.jpg",
  images: "/images/mywork.jpg",
  link: "",
  content: "## Overview\n\nWrite your content here.",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function entryToForm(entry: Entry, type: ContentType): FormState {
  return {
    originalSlug: entry.slug,
    slug: entry.slug,
    title: entry.metadata.title || "",
    subtitle: entry.metadata.subtitle || "",
    publishedAt: entry.metadata.publishedAt || new Date().toISOString().slice(0, 10),
    summary: entry.metadata.summary || "",
    tag: entry.metadata.tag || "Blog",
    image: entry.metadata.image || "/images/coding.jpg",
    images: Array.isArray(entry.metadata.images)
      ? entry.metadata.images.join("\n")
      : "/images/mywork.jpg",
    link: entry.metadata.link || "",
    content: entry.content || (type === "blog" ? "Write your blog post here." : emptyForm.content),
  };
}

export default function AdminContentManager() {
  const [type, setType] = useState<ContentType>("project");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(form.originalSlug);

  const endpoint = useMemo(() => `/api/content?type=${type}`, [type]);

  const loadEntries = async () => {
    setLoading(true);
    setStatus("");

    if (type === "gallery") {
      const response = await fetch("/api/gallery");
      const data = await response.json();

      if (response.ok) {
        setGalleryImages(data.images);
      } else {
        setStatus(data.message || "Unable to load gallery.");
      }

      setLoading(false);
      return;
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    if (response.ok) {
      setEntries(data.entries);
    } else {
      setStatus(data.message || "Unable to load entries.");
    }

    setLoading(false);
  };

  useEffect(() => {
    setForm({
      ...emptyForm,
      tag: type === "blog" ? "Blog" : "",
      content: type === "blog" ? "Write your blog post here." : emptyForm.content,
    });
    loadEntries();
  }, [type]);

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      slug: key === "title" && !current.originalSlug ? slugify(value) : current.slug,
    }));
  };

  const startNew = () => {
    setForm({
      ...emptyForm,
      tag: type === "blog" ? "Blog" : "",
      content: type === "blog" ? "Write your blog post here." : emptyForm.content,
    });
    setStatus("");
  };

  const editEntry = (entry: Entry) => {
    setForm(entryToForm(entry, type));
    setStatus("");
  };

  const saveEntry = async () => {
    if (type === "gallery") return;

    setLoading(true);
    setStatus("");

    const payload = {
      type,
      originalSlug: form.originalSlug,
      slug: form.slug || slugify(form.title),
      title: form.title,
      subtitle: form.subtitle,
      publishedAt: form.publishedAt,
      summary: form.summary,
      tag: form.tag,
      image: form.image,
      images: form.images
        .split(/\r?\n|,/)
        .map((image) => image.trim())
        .filter(Boolean),
      link: form.link,
      content: form.content,
    };

    const response = await fetch("/api/content", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      setStatus(isEditing ? "Updated successfully." : "Created successfully.");
      setForm(entryToForm(data.entry, type));
      await loadEntries();
    } else {
      setStatus(data.message || "Unable to save.");
    }

    setLoading(false);
  };

  const uploadImages = async (files: FileList | null, target: "image" | "images") => {
    if (!files?.length) return;

    setLoading(true);
    setStatus("Uploading image...");

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      const uploaded = data.uploaded as string[];

      if (type === "gallery") {
        const newImages: GalleryImage[] = uploaded.map((src) => ({
          src,
          alt: "Gallery image",
          orientation: "horizontal",
        }));
        const nextImages = [...galleryImages, ...newImages];

        setGalleryImages(nextImages);
        await saveGallery(nextImages);
      } else if (target === "image") {
        updateForm("image", uploaded[0]);
      } else {
        setForm((current) => ({
          ...current,
          images: [...current.images.split(/\r?\n|,/).map((image) => image.trim()).filter(Boolean), ...uploaded].join("\n"),
        }));
      }

      setStatus("Image uploaded.");
    } else {
      setStatus(data.message || "Unable to upload image.");
    }

    setLoading(false);
  };

  const saveGallery = async (images = galleryImages) => {
    setLoading(true);
    setStatus("");

    const response = await fetch("/api/gallery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });

    const data = await response.json();

    if (response.ok) {
      setGalleryImages(data.images);
      setStatus("Gallery updated.");
    } else {
      setStatus(data.message || "Unable to update gallery.");
    }

    setLoading(false);
  };

  const updateGalleryImage = (index: number, patch: Partial<GalleryImage>) => {
    setGalleryImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index ? { ...image, ...patch } : image,
      ),
    );
  };

  const removeGalleryImage = async (index: number) => {
    const nextImages = galleryImages.filter((_, imageIndex) => imageIndex !== index);
    setGalleryImages(nextImages);
    await saveGallery(nextImages);
  };

  return (
    <Column maxWidth="m" fillWidth gap="24" paddingTop="24">
      <Column gap="8">
        <Heading variant="display-strong-s">Content Manager</Heading>
        <Text onBackground="neutral-weak">
          Add and update projects, blog posts, and gallery images in the SQLite database.
        </Text>
      </Column>

      <Row gap="8" wrap>
        <Button variant={type === "project" ? "primary" : "secondary"} onClick={() => setType("project")}>
          Projects
        </Button>
        <Button variant={type === "blog" ? "primary" : "secondary"} onClick={() => setType("blog")}>
          Blog posts
        </Button>
        <Button variant={type === "gallery" ? "primary" : "secondary"} onClick={() => setType("gallery")}>
          Gallery
        </Button>
        {type !== "gallery" && (
          <Button variant="secondary" onClick={startNew}>
            New {type === "blog" ? "blog post" : "project"}
          </Button>
        )}
      </Row>

      {type === "gallery" ? (
        <Column fillWidth gap="20">
          <Column gap="8">
            <Heading as="h2" variant="heading-strong-l">
              Update Gallery
            </Heading>
            <Text onBackground="neutral-weak">
              Upload images, edit captions, choose layout orientation, and save the gallery.
            </Text>
          </Column>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => uploadImages(event.target.files, "images")}
          />

          <Column gap="16">
            {galleryImages.map((image, index) => (
              <Column
                key={`${image.src}-${index}`}
                gap="12"
                padding="16"
                radius="m"
                border="neutral-alpha-weak"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  style={{
                    width: "100%",
                    maxHeight: 220,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
                <Input
                  id={`gallery-alt-${index}`}
                  label="Caption"
                  value={image.alt}
                  onChange={(event) => updateGalleryImage(index, { alt: event.target.value })}
                />
                <Row gap="8" wrap>
                  <Button
                    variant={image.orientation === "horizontal" ? "primary" : "secondary"}
                    onClick={() => updateGalleryImage(index, { orientation: "horizontal" })}
                  >
                    Horizontal
                  </Button>
                  <Button
                    variant={image.orientation === "vertical" ? "primary" : "secondary"}
                    onClick={() => updateGalleryImage(index, { orientation: "vertical" })}
                  >
                    Vertical
                  </Button>
                  <Button variant="secondary" onClick={() => removeGalleryImage(index)}>
                    Remove
                  </Button>
                </Row>
              </Column>
            ))}
          </Column>

          <Row gap="12" vertical="center" wrap>
            <Button onClick={() => saveGallery()} disabled={loading}>
              Save Gallery
            </Button>
            {status && <Text onBackground="neutral-weak">{status}</Text>}
          </Row>
        </Column>
      ) : (
      <Row fillWidth gap="24" s={{ direction: "column" }}>
        <Column flex={4} gap="12">
          <Heading as="h2" variant="heading-strong-l">
            Existing {type === "blog" ? "blog posts" : "projects"}
          </Heading>
          {loading && <Text onBackground="neutral-weak">Loading...</Text>}
          {!loading && entries.length === 0 && (
            <Text onBackground="neutral-weak">No entries yet.</Text>
          )}
          {entries.map((entry) => (
            <Button
              key={entry.slug}
              variant={form.originalSlug === entry.slug ? "primary" : "secondary"}
              onClick={() => editEntry(entry)}
            >
              {entry.metadata.title || entry.slug}
            </Button>
          ))}
        </Column>

        <Column flex={8} gap="16">
          <Heading as="h2" variant="heading-strong-l">
            {isEditing ? "Update" : "Add"} {type === "blog" ? "blog post" : "project"}
          </Heading>

          <Input
            id="title"
            label="Title"
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
          />
          <Input
            id="slug"
            label="Slug"
            value={form.slug}
            onChange={(event) => updateForm("slug", slugify(event.target.value))}
          />
          <Input
            id="publishedAt"
            label="Published date"
            value={form.publishedAt}
            onChange={(event) => updateForm("publishedAt", event.target.value)}
          />
          <Input
            id="summary"
            label="Summary"
            value={form.summary}
            onChange={(event) => updateForm("summary", event.target.value)}
          />

          {type === "blog" ? (
            <>
              <Input
                id="subtitle"
                label="Subtitle"
                value={form.subtitle}
                onChange={(event) => updateForm("subtitle", event.target.value)}
              />
              <Input
                id="tag"
                label="Tag"
                value={form.tag}
                onChange={(event) => updateForm("tag", event.target.value)}
              />
              <Column gap="8">
                <Text variant="label-default-m">Featured image</Text>
                {form.image && <Text onBackground="neutral-weak">{form.image}</Text>}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadImages(event.target.files, "image")}
                />
              </Column>
            </>
          ) : (
            <>
              <Input
                id="link"
                label="Project link"
                value={form.link}
                onChange={(event) => updateForm("link", event.target.value)}
              />
              <Column gap="8">
                <Text variant="label-default-m">Project images</Text>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => uploadImages(event.target.files, "images")}
                />
                <textarea
                  value={form.images}
                  readOnly
                  rows={5}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    borderRadius: 8,
                    border: "1px solid var(--neutral-alpha-medium)",
                    background: "var(--page-background)",
                    color: "var(--neutral-on-background-strong)",
                    padding: 12,
                    font: "inherit",
                  }}
                />
              </Column>
            </>
          )}

          <Column gap="8">
            <Text variant="label-default-m">Content</Text>
            <textarea
              value={form.content}
              onChange={(event) => updateForm("content", event.target.value)}
              rows={14}
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 8,
                border: "1px solid var(--neutral-alpha-medium)",
                background: "var(--page-background)",
                color: "var(--neutral-on-background-strong)",
                padding: 12,
                font: "inherit",
                fontFamily: "var(--font-code)",
              }}
            />
          </Column>

          <Row gap="12" vertical="center" wrap>
            <Button onClick={saveEntry} disabled={loading}>
              {isEditing ? "Update" : "Create"}
            </Button>
            {status && <Text onBackground="neutral-weak">{status}</Text>}
          </Row>
        </Column>
      </Row>
      )}
    </Column>
  );
}
