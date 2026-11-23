import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.safeParse(await request.json());
    if (!body.success) {
      return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: body.data.email.toLowerCase() }).select("+passwordHash");
    if (!user || !user.active || !(await bcrypt.compare(body.data.password, user.passwordHash))) {
      return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    const session = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = await createSessionToken(session);
    return Response.json({ user: session }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (error) {
    console.error("Login failed.", error);
    return Response.json({ error: "No se pudo iniciar sesión. Inténtalo de nuevo." }, { status: 500 });
  }
}
