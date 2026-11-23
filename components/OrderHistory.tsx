"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownToLine, BookOpen, LoaderCircle } from "lucide-react";

interface OrderItem {
  bookId: string;
  title: string;
  author: string;
  quantity: number;
  assetFileName?: string;
}

interface Order {
  _id: string;
  items: OrderItem[];
  totalCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

const statusNames: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  sent: "Enviado",
  delivered: "Entregado",
};

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/orders")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar tus libros.");
        setOrders(data.orders);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar tus libros."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page-shell history-page">
      <div className="checkout-heading"><span className="eyebrow">TU BIBLIOTECA DIGITAL</span><h1>Mis libros</h1><p>Tus compras y lecturas, siempre a la mano.</p></div>
      {loading ? <div className="loading-line"><LoaderCircle className="spin" /> Cargando tu biblioteca…</div> : null}
      {error && <div className="notice notice-error">{error} <Link href="/login">Ingresar</Link></div>}
      {!loading && !error && !orders.length && <div className="empty-state"><BookOpen size={28} /><h2>Aquí comienza tu biblioteca</h2><p>Cuando completes tu primera compra, tus libros aparecerán aquí.</p><Link className="primary-button" href="/#catalog">Explorar libros</Link></div>}
      <div className="orders-list">
        {orders.map((order) => (
          <section className="history-order" key={order._id}>
            <header><div><span>Pedido #{order._id.slice(-8).toUpperCase()}</span><small>{new Date(order.createdAt).toLocaleDateString("es", { dateStyle: "long" })}</small></div><span className={`status-pill status-${order.status}`}>{statusNames[order.status] ?? order.status}</span></header>
            {order.items.map((item) => (
              <div className="library-book" key={item.bookId}>
                <span className="library-book-icon"><BookOpen size={18} /></span>
                <div><h3>{item.title}</h3><p>{item.author}{item.quantity > 1 ? ` · ${item.quantity} copias` : ""}</p></div>
                {item.assetFileName
                  ? <a className="download-button" href={`/api/orders/${order._id}/books/${item.bookId}/download`}><ArrowDownToLine size={16} /> Descargar</a>
                  : <span className="download-unavailable">Archivo por publicar</span>}
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
