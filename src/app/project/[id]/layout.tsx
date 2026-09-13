import db from "@/lib/db";
import { notFound } from "next/navigation";
import { WorkflowNav } from "@/components/workflow-nav";
import type { Project } from "@/lib/types";

export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/project/[id]">) {
  const { id } = await params;
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | Project
    | undefined;
  if (!project) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="mb-4 font-heading text-2xl font-bold tracking-tight">{project.name}</h1>
      <WorkflowNav projectId={id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
