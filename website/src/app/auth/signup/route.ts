import { redirect } from "next/navigation";
import { workos } from "~/server/workos";
import env from "~/env.js";

export function GET() {
  const url = workos.userManagement.getAuthorizationUrl({
    clientId: env.WORKOS_CLIENT_ID,
    provider: "authkit",
    screenHint: "sign-up",
    redirectUri: env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
  });

  return redirect(url);
}
