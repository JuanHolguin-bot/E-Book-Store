import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(72),
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.safeParse(await request.json());
    if (!body.success) {
      return Response.json({ error: "Ingresa un nombre, correo y contraseña válidos (mínimo 10 caracteres)." }, { status: 400 });
    }

    await connectToDatabase();
    const email = body.data.email.toLowerCase();
    if (await User.exists({ email })) {
      return Response.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }

    const user = await User.create({
      name: body.data.name,
      email,
      passwordHash: await bcrypt.hash(body.data.password, 12),
      role: "client",
    });
    const session = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = await createSessionToken(session);
    return Response.json({ user: session }, { status: 201, headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return Response.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }
    console.error("Registration failed.", error);
    return Response.json({ error: "No se pudo completar el registro. Inténtalo de nuevo." }, { status: 500 });
  }
}
