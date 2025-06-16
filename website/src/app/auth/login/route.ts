import {redirect} from "next/navigation";
import { workos } from "~/server/workos";
import env from "~/env.js";
import type { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectUrl = searchParams.get("url");
  let state: string;
  if (!redirectUrl) {
    state = ""
  } else {
    state = redirectUrl
  }
  const url = workos.userManagement.getAuthorizationUrl({
    clientId: env.WORKOS_CLIENT_ID,
    provider: "authkit",
    screenHint: "sign-in",
    redirectUri: env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
    state
  })

  console.log("AUTH", state)

  return redirect(url);
}