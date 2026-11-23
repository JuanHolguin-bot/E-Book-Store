import { z } from "zod";
import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models";

const updateUserSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i),
  role: z.enum(["client", "staff"]).optional(),
  active: z.boolean().optional(),
}).refine((value) => value.role !== undefined || value.active !== undefined);

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();
    if (user.role !== "staff") return forbidden();

    await connectToDatabase();
    const users = await User.find().select("name email role active createdAt").sort({ createdAt: -1 }).lean();
    return Response.json({ users });
  } catch (error) {
    console.error("Listing users failed.", error);
    return Response.json({ error: "No se pudieron cargar los usuarios." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();
    if (user.role !== "staff") return forbidden();

    const body = updateUserSchema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "Los datos del usuario no son válidos." }, { status: 400 });
    if (body.data.userId === user.id && body.data.active === false) {
      return Response.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 400 });
    }

    await connectToDatabase();
    const updatedUser = await User.findByIdAndUpdate(
      body.data.userId,
      { ...(body.data.role ? { role: body.data.role } : {}), ...(body.data.active !== undefined ? { active: body.data.active } : {}) },
      { new: true, runValidators: true },
    ).select("name email role active");
    if (!updatedUser) return Response.json({ error: "No se encontró el usuario." }, { status: 404 });
    if (updatedUser.role !== "staff" || !updatedUser.active) {
      globalThis.io?.sockets.sockets.forEach((socket) => {
        if (socket.data.userId === updatedUser.id) {
          socket.emit("auth:revoked");
          socket.disconnect(true);
        }
      });
    }
    return Response.json({ user: updatedUser });
  } catch (error) {
    console.error("Updating user failed.", error);
    return Response.json({ error: "No se pudo actualizar el usuario." }, { status: 500 });
  }
}
