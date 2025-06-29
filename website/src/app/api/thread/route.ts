import { redirect } from "next/navigation";

export function POST() {
  return redirect("/api/chat/thread")
}