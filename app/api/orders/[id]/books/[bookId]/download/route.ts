import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api-auth";
import { forbidden, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; bookId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();
    const { id, bookId } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id) || !/^[a-f\d]{24}$/i.test(bookId)) {
      return Response.json({ error: "El enlace de descarga no es válido." }, { status: 400 });
    }

    await connectToDatabase();
    const order = await Order.findById(id);
    if (!order || order.paymentStatus !== "paid") {
      return Response.json({ error: "No se encontró una compra pagada." }, { status: 404 });
    }
    if (user.role !== "staff" && order.userId.toString() !== user.id) return forbidden();

    const item = order.items.find((entry) => entry.bookId.toString() === bookId);
    if (!item) return Response.json({ error: "Este libro no pertenece al pedido." }, { status: 404 });
    const fileName = item.assetFileName;
    if (!fileName || path.basename(fileName) !== fileName || !/\.(pdf|epub)$/i.test(fileName)) {
      return Response.json({ error: "El archivo digital aún no está disponible." }, { status: 404 });
    }

    const booksDirectory = path.resolve(process.cwd(), "private", "books");
    const filePath = path.join(booksDirectory, fileName);
    const [resolvedDirectory, resolvedFile] = await Promise.all([
      realpath(booksDirectory),
      realpath(filePath),
    ]);
    if (!resolvedFile.startsWith(`${resolvedDirectory}${path.sep}`)) {
      return Response.json({ error: "El archivo solicitado no es válido." }, { status: 400 });
    }
    const fileStats = await stat(resolvedFile);
    if (!fileStats.isFile()) return Response.json({ error: "El archivo no está disponible." }, { status: 404 });

    const stream = createReadStream(resolvedFile);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": fileName.toLowerCase().endsWith(".epub") ? "application/epub+zip" : "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(fileStats.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Downloading ebook failed.", error);
    return Response.json({ error: "No se pudo descargar el libro." }, { status: 404 });
  }
}
