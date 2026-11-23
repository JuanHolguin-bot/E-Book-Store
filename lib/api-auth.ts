import type { NextRequest } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models";

export async function getCurrentUser(request: NextRequest): Promise<SessionUser | null> {
  const session = await getSession(request);
  if (!session) return null;

  await connectToDatabase();
  const user = await User.findById(session.id).select("name email role active");
  if (!user || !user.active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
