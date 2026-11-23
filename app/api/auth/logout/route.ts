import { clearSessionCookie, getSession } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (session) {
    globalThis.io?.sockets.sockets.forEach((socket) => {
      if (socket.data.userId === session.id) socket.disconnect(true);
    });
  }
  return Response.json({ success: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
