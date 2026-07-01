import { Meta, Schema } from "@once-ui-system/core";
import { baseURL, person } from "@/resources";
import AdminContentManager from "./AdminContentManager";

export async function generateMetadata() {
  return Meta.generate({
    title: "Content Manager",
    description: "Create and edit portfolio projects and blog posts.",
    baseURL,
    path: "/admin",
  });
}

export default function AdminPage() {
  return (
    <>
      <Schema
        as="webPage"
        baseURL={baseURL}
        path="/admin"
        title="Content Manager"
        description="Create and edit portfolio projects and blog posts."
        author={{
          name: person.name,
          url: `${baseURL}/about`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <AdminContentManager />
    </>
  );
}
