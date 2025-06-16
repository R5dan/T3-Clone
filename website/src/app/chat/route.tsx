import { api } from "convex/_generated/api";
import { redirect } from "next/navigation";
import { fetchMutation } from "convex/nextjs";

export async function GET() {
  const thread = await fetchMutation(api.messages.createThread, {
    name: "New Thread",
    userId: "local",
  });

  return redirect(`/chat/${thread}`);
}