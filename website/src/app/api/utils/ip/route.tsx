import { ipAddress } from "@vercel/functions";

export async function GET(req: Request) {
  const ip = ipAddress(req)

  return Response.json({ip});
}
