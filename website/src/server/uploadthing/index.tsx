"use client";

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { genUploader } from "uploadthing/client";
import {
  generateUploadDropzone,
  generateUploadButton,
  generateReactHelpers,
} from "@uploadthing/react";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import type { ClientUploadedFileData } from "uploadthing/types";
import type { Id } from "../../../convex/_generated/dataModel";
import { z } from "zod";
import { useRef } from "react";
import { Plus } from "lucide-react";
import { FilePreview } from "../chat/files";

export type FilePreview = {
  name: string;
  type: string;
  size: number;
  id: Id<"files"> | Id<"images">;
};

export type FilePreviewLocal = {
  name: string;
  type: string;
  size: number;
  url: string;
};

type a = keyof FilePreviewLocal

const f = createUploadthing();
export const uploadRouter = {
  router: f(["image/png", "image/jpeg", "image/webp", "pdf", "text"], {
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
        };
      } else {
        const fileId = await fetchMutation(api.files.createFile, {
          url: file.ufsUrl,
          mimeType: file.type,
          filename: file.name,
        });
        return { id: fileId };
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
  return async (
    res: ClientUploadedFileData<{ id: Id<"files"> | Id<"images"> }>[],
  ) => {
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

const { useUploadThing } = generateReactHelpers();

export const useFiles = () => useUploadThing((endpoint) => endpoint.router, {});

export const FileInput = ({
  handleFile,
  files,
}: {
    handleFile: (file: FilePreviewLocal) => void;
    files: FilePreviewLocal[];
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const elm = e.target;
    if (!elm.files) return;
    const names = files.map((file) => file.name);
    const newFiles = Array.from(e.target.files ?? []).filter((file) => !names.includes(file.name))
    newFiles.forEach((file) => {
      handleFile({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    });
  };

  return (
    <div className="flex items-center gap-4 my-auto">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp, pdf, text"
      />

      {/* Styled button */}
      <button
        type="button"
        onClick={() => fileInputRef.current.click()}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-gray-700"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
};

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
