import { z } from "zod";

export const PyPiMetadataSchema = z.object({
  author: z.string(),
  author_email: z.string(),
  classifiers: z.array(z.string()),
  description: z.string(),
  description_content_type: z.string(),
  home_page: z.string(),
  keywords: z.string(),
  license: z.string(),
  maintainer: z.string(),
  maintainer_email: z.string(),
  name: z.string(),
  package_url: z.string().url(),
  platform: z.null(),
  project_url: z.string().url(),
  project_urls: z.record(z.string(), z.string().url()),
  provides_extra: z.array(z.string()),
  release_url: z.string().url(),
  requires_dist: z.array(z.string()),
  requires_python: z.string(),
  summary: z.string(),
  version: z.string(),
  yanked: z.boolean(),
  yanked_reason: z.null(),
});

export const emptyObjectSchema = z.object({});

export type PyPiMetadata = z.infer<typeof PyPiMetadataSchema>;
export type emptyObject = z.infer<typeof emptyObjectSchema>;
export type PyPiMetadatas = (PyPiMetadata | emptyObject)[];

export const searchPypi = async (query: string): Promise<PyPiMetadatas> => {
  const searchRes = await fetch(
    `https://pypi.org/search/?q=${encodeURIComponent(query)}`,
  );
  const projectHtml = document.createElement("html");
  projectHtml.innerHTML = await searchRes.text();
  const projects = Array.from(projectHtml.getElementsByClassName(
    "package-snippet__name",
  )).map((link) => link.textContent);

  const data = projects.map(async (name) => {
    const res = await fetch(`http://pypi.python.org/pypi/${name}/json`);
    const metadata = (await res.json()).info;
    const parsed = PyPiMetadataSchema.safeParse(metadata);
    if (parsed.success) {
      return parsed.data;
    }
    return {};
  })

  return await Promise.all(data);
};

