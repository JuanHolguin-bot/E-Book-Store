import { z } from "zod";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api-auth";
import { unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";
import { captureMatchesOrder, capturePayPalOrder, getCompletedCapture } from "@/lib/paypal";
import { broadcastOrder } from "@/lib/realtime";

const captureSchema = z.object({ paypalOrderId: z.string().min(1).max(64) });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();
    const body = captureSchema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "El pago indicado no es válido." }, { status: 400 });

    await connectToDatabase();
    const order = await Order.findOne({ paypalOrderId: body.data.paypalOrderId, userId: user.id });
    if (!order) return Response.json({ error: "No se encontró un pedido para este pago." }, { status: 404 });
    if (order.paymentStatus === "paid") return Response.json({ order });

    const captureResponse = await capturePayPalOrder(order.paypalOrderId);
    const capture = getCompletedCapture(captureResponse);
    if (!capture) {
      order.paymentStatus = "failed";
      await order.save();
      return Response.json({ error: "PayPal no confirmó el pago. No se creó la reserva." }, { status: 402 });
    }

    if (!captureMatchesOrder(capture, order.totalCents, order.currency)) {
      order.paymentStatus = "failed";
      await order.save();
      return Response.json({ error: "El importe confirmado por PayPal no coincide con el pedido." }, { status: 409 });
    }

    order.paymentStatus = "paid";
    order.paypalCaptureId = capture.id;
    order.status = "pending";
    await order.save();
    broadcastOrder(order, "order:created");
    return Response.json({ order });
  } catch (error) {
    console.error("Capturing PayPal payment failed.", error);
    return Response.json({ error: "No se pudo confirmar el pago. Revisa PayPal e inténtalo de nuevo." }, { status: 502 });
  }
}
