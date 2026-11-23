import { getCurrentUser } from "@/lib/api-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    return Response.json({ user });
  } catch (error) {
    console.error("Loading current user failed.", error);
    return Response.json({ error: "No se pudo validar la sesión." }, { status: 500 });
  }
}
