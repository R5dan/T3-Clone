import { createUploadthing, type FileRouter } from "uploadthing/next";
import { genUploader } from "uploadthing/client";
import {
  generateUploadDropzone,
  generateUploadButton,
} from "@uploadthing/react";
import { fetchMutation } from "convex/nextjs";
import { api } from "convex/_generated/api";
import type { ClientUploadedFileData } from "uploadthing/types";
import type { Id } from "convex/_generated/dataModel";
import { z } from "zod";

export type FilePreview = {
  name: string;
  type: string;
  size: number;
  id: Id<"files"> | Id<"images">;
};

const f = createUploadthing();
export const uploadRouter = {
  router: f(["image/png", "image/jpeg", "image/webp", "blob"], {
    awaitServerData: true,
  })
    .input(z.object({}))
    .onUploadComplete(async ({ file }) => {
    if (file.type.startsWith("image")) {
      const imageId = await fetchMutation(api.files.createImage, {
        url: file.ufsUrl,
        mimeType: file.type,
        filename: file.name,
      });
      return {
        id: imageId,
      }
    } else {
      const fileId = await fetchMutation(api.files.createFile, {
        url: file.ufsUrl,
        mimeType: file.type,
        filename: file.name,
      });
      return {id: fileId};
    }
  }),
} satisfies FileRouter;

export const { uploadFiles } = genUploader<typeof uploadRouter>();

const UploadDropzoneBase = generateUploadDropzone<typeof uploadRouter>({
  url: "/api/uploadthing",
});

const uploadComplete = (
  setFiles: React.Dispatch<React.SetStateAction<FilePreview[]>>,
  files: FilePreview[],
) => {
  return async (res: ClientUploadedFileData<{ id: Id<"files"> | Id<"images">; }>[]) => {
    setFiles(
      files.concat(
        res.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          ufsUrl: file.ufsUrl,
          id: file.serverData.id,
        })),
      ),
    );
  };
};

export const UploadDropzone = ({
  setFiles,
  files,
}: {
  setFiles: React.Dispatch<React.SetStateAction<FilePreview[]>>;
  files: FilePreview[];
}) => {
  return (
    <UploadDropzoneBase
      endpoint={(route) => route.router}
      onClientUploadComplete={uploadComplete(setFiles, files)}
      input={{}}
    />
  );
};

const UploadButtonBase = generateUploadButton<typeof uploadRouter>();

export const UploadButton = ({
  setFiles,
  files,
}: {
  setFiles: React.Dispatch<React.SetStateAction<FilePreview[]>>;
  files: FilePreview[];
}) => {
  return (
    <UploadButtonBase
      endpoint={(route) => route.router}
      onClientUploadComplete={uploadComplete(setFiles, files)}
      input={{}}
    />
  );
};
