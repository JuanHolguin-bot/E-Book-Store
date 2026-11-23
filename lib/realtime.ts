import type { Server } from "socket.io";
import type { OrderDocument } from "@/lib/models";

declare global {
  var io: Server | undefined;
}

export function broadcastOrder(order: OrderDocument, event: "order:created" | "order:updated") {
  globalThis.io?.to("staff").emit(event, {
    id: order.id,
    userId: order.userId.toString(),
    items: order.items.map((item) => ({
      title: item.title,
      author: item.author,
      quantity: item.quantity,
    })),
    totalCents: order.totalCents,
    currency: order.currency,
    deliveryEmail: order.deliveryEmail,
    paymentStatus: order.paymentStatus,
    status: order.status,
    createdAt: order.createdAt,
  });
}
