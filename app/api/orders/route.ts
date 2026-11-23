import { getCurrentUser } from "@/lib/api-auth";
import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorized();
    await connectToDatabase();

    const filter = user.role === "staff"
      ? { paymentStatus: "paid" }
      : { userId: user.id, paymentStatus: "paid" };
    const orders = await Order.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();
    return Response.json({ orders });
  } catch (error) {
    console.error("Loading orders failed.", error);
    return Response.json({ error: "No se pudieron cargar los pedidos." }, { status: 500 });
  }
}
