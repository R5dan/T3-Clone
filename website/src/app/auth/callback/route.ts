import { handleAuth } from "@workos-inc/authkit-nextjs";
import { fetchMutation } from "convex/nextjs";
import { workos } from "~/server/workos";
import { defaultMetadata } from "~/server/workos/defaults";
import { api } from "../../../../convex/_generated/api";



// Redirect the user to `/` after successful sign in
// The redirect can be customized: `handleAuth({ returnPathname: '/foo' })`
export const GET = handleAuth({
  returnPathname: "/chat",
  async onSuccess(data) {
    if (!data.user.metadata.userId) {
      const uid = await fetchMutation(api.utils.addUser, {
        userId: data.user.id,
      });
      await workos.userManagement.updateUser({
        userId: data.user.id,
        metadata: {
          userId: uid,
          openRouterKey: "",
          defaultModel: "google/gemini-2.0-flash-exp:free",
          titleModel: "google/gemini-2.0-flash-exp:free",
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
});
