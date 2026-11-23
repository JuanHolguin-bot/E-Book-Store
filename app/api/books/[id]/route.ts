import { z } from "zod";
import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { Book } from "@/lib/models";

const updateBookSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  author: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  priceCents: z.number().int().min(0).max(1000000).optional(),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  assetFileName: z.string().regex(/^[A-Za-z0-9._ -]+\.(pdf|epub)$/i).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();
    if (user.role !== "staff") return forbidden();

    const { id } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id)) return Response.json({ error: "El libro indicado no es válido." }, { status: 400 });
    const body = updateBookSchema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "Los datos del libro no son válidos." }, { status: 400 });
    await connectToDatabase();
    const book = await Book.findByIdAndUpdate(id, body.data, { new: true, runValidators: true });
    if (!book) return Response.json({ error: "No se encontró el libro." }, { status: 404 });
    return Response.json({ book });
  } catch (error) {
    console.error("Updating book failed.", error);
    return Response.json({ error: "No se pudo actualizar el libro." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();
    if (user.role !== "staff") return forbidden();

    const { id } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id)) return Response.json({ error: "El libro indicado no es válido." }, { status: 400 });
    await connectToDatabase();
    const book = await Book.findByIdAndUpdate(id, { active: false }, { new: true });
    if (!book) return Response.json({ error: "No se encontró el libro." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Archiving book failed.", error);
    return Response.json({ error: "No se pudo retirar el libro del catálogo." }, { status: 500 });
  }
}
