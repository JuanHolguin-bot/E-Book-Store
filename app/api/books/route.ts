import { z } from "zod";
import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { Book } from "@/lib/models";

const bookSchema = z.object({
  title: z.string().trim().min(1).max(160),
  author: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  category: z.string().trim().min(1).max(80),
  priceCents: z.number().int().min(0).max(1000000),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  assetFileName: z.string().regex(/^[A-Za-z0-9._ -]+\.(pdf|epub)$/i).optional(),
});

export async function GET() {
  try {
    await connectToDatabase();
    const books = await Book.find({ active: true }).select("-assetFileName").sort({ createdAt: -1 }).lean();
    return Response.json({ books });
  } catch (error) {
    console.error("Loading catalog failed.", error);
    return Response.json({ error: "No se pudo cargar el catálogo. Comprueba la conexión a MongoDB." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();
    if (user.role !== "staff") return forbidden();

    const body = bookSchema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "Revisa los datos del libro." }, { status: 400 });
    await connectToDatabase();
    const book = await Book.create(body.data);
    return Response.json({ book }, { status: 201 });
  } catch (error) {
    console.error("Creating book failed.", error);
    return Response.json({ error: "No se pudo crear el libro." }, { status: 500 });
  }
}
