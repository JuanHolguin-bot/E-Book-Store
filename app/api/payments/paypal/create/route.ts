import { Types } from "mongoose";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/api-auth";
import { unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Book, Order } from "@/lib/models";
import { createPayPalOrder, getPayPalApprovalUrl } from "@/lib/paypal";

const createPaymentSchema = z.object({
  items: z.array(z.object({
    bookId: z.string().regex(/^[a-f\d]{24}$/i),
    quantity: z.number().int().min(1).max(10),
  })).min(1).max(20),
  deliveryEmail: z.string().trim().email().max(254),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();

    const body = createPaymentSchema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "Revisa los productos y el correo de entrega." }, { status: 400 });
    if (new Set(body.data.items.map((item) => item.bookId)).size !== body.data.items.length) {
      return Response.json({ error: "El carrito contiene productos duplicados." }, { status: 400 });
    }

    await connectToDatabase();
    const books = await Book.find({
      _id: { $in: body.data.items.map((item) => new Types.ObjectId(item.bookId)) },
      active: true,
    });
    if (books.length !== body.data.items.length) {
      return Response.json({ error: "Uno o más libros ya no están disponibles." }, { status: 409 });
    }

    const bookById = new Map(books.map((book) => [book.id, book]));
    const items = body.data.items.map((item) => {
      const book = bookById.get(item.bookId);
      if (!book) throw new Error("A requested book was not found.");
      return {
        bookId: book._id,
        title: book.title,
        author: book.author,
        priceCents: book.priceCents,
        quantity: item.quantity,
        ...(book.assetFileName ? { assetFileName: book.assetFileName } : {}),
      };
    });
    const totalCents = items.reduce((total, item) => total + item.priceCents * item.quantity, 0);
    if (!Number.isSafeInteger(totalCents) || totalCents < 1) {
      return Response.json({ error: "El importe total del pedido no es válido." }, { status: 400 });
    }

    const localOrderId = new Types.ObjectId();
    const paypalOrder = await createPayPalOrder({
      localOrderId: localOrderId.toString(),
      currency: "USD",
      totalCents,
      deliveryEmail: body.data.deliveryEmail.toLowerCase(),
    });
    const approvalUrl = getPayPalApprovalUrl(paypalOrder);
    if (!approvalUrl) throw new Error("PayPal response did not contain an approval link.");

    const order = await Order.create({
      _id: localOrderId,
      userId: user.id,
      items,
      totalCents,
      currency: "USD",
      deliveryEmail: body.data.deliveryEmail.toLowerCase(),
      paypalOrderId: paypalOrder.id,
      paymentStatus: "pending",
      status: "pending",
    });

    return Response.json({ orderId: order.id, approvalUrl }, { status: 201 });
  } catch (error) {
    console.error("Creating PayPal order failed.", error);
    return Response.json({ error: "No se pudo iniciar el pago. Comprueba la configuración de PayPal e inténtalo otra vez." }, { status: 502 });
  }
}
