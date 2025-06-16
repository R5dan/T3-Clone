import { Page as Chat } from "./chat";

export default async function Page({ params }: { params: Promise<{ threadId: string }> }) {
  //console.log(`threadId: ${params.threadId}, ${params}`);
  const { threadId } = await params;
  console.log(`threadId: ${threadId}`);
  return <Chat threadId={threadId} />;
}