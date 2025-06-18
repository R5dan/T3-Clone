import { Image } from "@imagekit/next";
import type { Id } from "../../../../convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";
import { api } from "convex/_generated/api";
import dark from "../highlighter/dark";
import light from "../highlighter/light";
import hljs from "highlight.js";
import mimes from "../highlighter/mimes";

export async function ImagePreview({ id }: { id: Id<"images"> }) {
  const image = await fetchQuery(api.files.getImage, { image: id });
  if (image instanceof Error) {
    return <div>Error: No image</div>;
  }
  return (
    <Image
      src={image.url}
      alt={`${image.filename ?? "image"} preview`}
      width={200}
      height={200}
      urlEndpoint="https://ik.imagekit.io/gg882iu3u/"
      loading="eager"
    />
  );
}

export async function TextImage({ id }: { id: Id<"images"> }) {
  const image = await fetchQuery(api.files.getImage, { image: id });
  if (image instanceof Error) {
    return <div>Error: No image</div>;
  }
  return (
    <Image
      src={image.url}
      alt={`${image.filename ?? "image"}`}
      urlEndpoint="https://ik.imagekit.io/gg882iu3u/"
      loading="eager"
    />
  );
}

export async function FilePreview({ id }: {id: Id<"files">}) {
  const file = await fetchQuery(api.files.getFile, { file: id });
  if (file instanceof Error) {
    return <div>Error: No file</div>;
  }
  return (
    <div>
      <span>{file.filename}</span>
      <span>{file.mimeType}</span>
    </div>
  );
}

export async function TextFile({ id }: { id: Id<"files"> }) {
  const file = await fetchQuery(api.files.getFile, { file: id });
  if (file instanceof Error) {
    return <div>Error: No file</div>;
  }
  let fileData = "";
  let error = false;
  const reader = new FileReader();
  reader.onload = (e) => {
    fileData = e.target?.result as string;
  }
  reader.onerror = (e) => {
    error = true;
  }
  reader.readAsDataURL(await (await fetch(file.url)).blob());
  if (error) {
    return <div>Error: Couldn&apos;t read file</div>;
  }
  return (
    <div>
      <div>
        <span dangerouslySetInnerHTML={{__html: hljs.highlight(fileData, {language: mimes[file.mimeType as keyof typeof mimes]}).value}}/>
      </div>
    </div>
  );
}
