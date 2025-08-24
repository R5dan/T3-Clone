import { handleAuth } from "@workos-inc/authkit-nextjs";
import { fetchMutation } from "convex/nextjs";
import { workos } from "~/server/workos";
import { DEFAULT_MODEL, DEFAULT_TITLE_MODEL, defaultMetadata } from "~/server/workos/defaults";
import { api } from "../../../../convex/_generated/api";

import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export const GET = async (request: NextRequest) => {
  await handleAuth({
    async onSuccess(data) {
      if (!data.user.metadata.userId) {
        const uid = await fetchMutation(api.utils.addUser, {
          userId: data.user.id,
          email: data.user.email,
        });
        await workos.userManagement.updateUser({
          userId: data.user.id,
          metadata: {
            userId: uid,
            openRouterKey: "",
            defaultModel: DEFAULT_MODEL,
            titleModel: DEFAULT_TITLE_MODEL,
          },
        });
      } else if (
        !(
          data.user.metadata.openRouterKey &&
          data.user.metadata.defaultModel &&
          data.user.metadata.titleModel
        )
      ) {
        await workos.userManagement.updateUser({
          userId: data.user.id,
          metadata: {
            ...defaultMetadata,
            ...data.user.metadata,
          },
        });
      }
    },
  })(request)

  return redirect(request.nextUrl.searchParams.get("url") ?? "/chat");
}