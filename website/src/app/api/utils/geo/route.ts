import { geolocation } from "@vercel/functions";

export async function GET(req: Request) {
  const details = geolocation(req);

  return Response.json(details);
}