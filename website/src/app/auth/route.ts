import { redirect } from "next/navigation";
//import { withAuth } from "@workos-inc/authkit-nextjs";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  //const user = await withAuth();
  //if (user) {
    return redirect("/chat");
  //}
  //return redirect("/auth/login");
}
