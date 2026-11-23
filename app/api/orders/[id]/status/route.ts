import { z } from "zod";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api-auth";
import { forbidden, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";
import { broadcastOrder } from "@/lib/realtime";

const statusSchema = z.object({
  status: z.enum(["pending", "processing", "sent", "delivered"]),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();
    if (user.role !== "staff") return forbidden();

    const { id } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id)) return Response.json({ error: "El pedido indicado no es válido." }, { status: 400 });
    const body = statusSchema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "El estado indicado no es válido." }, { status: 400 });

    await connectToDatabase();
    const order = await Order.findOneAndUpdate(
      { _id: id, paymentStatus: "paid" },
      { status: body.data.status },
      { new: true, runValidators: true },
    );
    if (!order) return Response.json({ error: "No se encontró el pedido pagado." }, { status: 404 });

    broadcastOrder(order, "order:updated");
    return Response.json({ order });
  } catch (error) {
    console.error("Updating order status failed.", error);
    return Response.json({ error: "No se pudo actualizar el estado del pedido." }, { status: 500 });
  }
}
