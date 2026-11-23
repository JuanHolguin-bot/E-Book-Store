"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Activity, ArrowRight, BookOpen, CheckCircle2, CircleUserRound, GripVertical, LibraryBig, LoaderCircle, Plus, Radio, Shield, ShoppingBag, Users, X } from "lucide-react";

type OrderStatus = "pending" | "processing" | "sent" | "delivered";
type DashboardTab = "orders" | "catalog" | "users";

interface Order {
  _id: string;
  userId: { name: string; email: string } | string;
  items: Array<{ bookId: string; title: string; author: string; quantity: number }>;
  totalCents: number;
  currency: string;
  deliveryEmail: string;
  status: OrderStatus;
  createdAt: string;
}

interface Book {
  _id: string;
  title: string;
  author: string;
  category: string;
  priceCents: number;
  active: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: "client" | "staff";
  active: boolean;
}

const columns: Array<{ id: OrderStatus; title: string; hint: string }> = [
  { id: "pending", title: "Pendiente", hint: "Pedido confirmado" },
  { id: "processing", title: "Procesando", hint: "Preparando entrega" },
  { id: "sent", title: "Enviado", hint: "Acceso disponible" },
  { id: "delivered", title: "Entregado", hint: "Completado" },
];
const statusNames: Record<OrderStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  sent: "Enviado",
  delivered: "Entregado",
};
const money = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" });

export function StaffDashboard() {
  const [tab, setTab] = useState<DashboardTab>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [draggedOrder, setDraggedOrder] = useState<string | null>(null);

  const loadData = useCallback(async (section: DashboardTab) => {
    const endpoint = section === "orders" ? "/api/orders" : section === "catalog" ? "/api/books" : "/api/users";
    const response = await fetch(endpoint);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudieron cargar los datos.");
    if (section === "orders") setOrders(data.orders);
    if (section === "catalog") setBooks(data.books);
    if (section === "users") setUsers(data.users);
  }, []);

  useEffect(() => {
    let active = true;
    let socket: Socket | undefined;
    const initialize = async () => {
      const sessionResponse = await fetch("/api/auth/me");
      const sessionData = await sessionResponse.json();
      if (!sessionResponse.ok) throw new Error(sessionData.error || "No se pudo validar la sesión.");
      if (sessionData.user?.role !== "staff") {
        setAuthorized(false);
        setError("Esta sección está disponible únicamente para el equipo de la tienda.");
        return;
      }

      setAuthorized(true);
      socket = io({ path: "/socket.io" });
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socket.on("auth:revoked", () => {
        setAuthorized(false);
        setError("Tu acceso al panel fue revocado.");
      });
      const refreshOrders = () => {
        void loadData("orders").catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : "No se pudieron actualizar los pedidos.");
        });
      };
      socket.on("order:created", refreshOrders);
      socket.on("order:updated", refreshOrders);
      await loadData(tab);
    };
    void initialize()
      .catch((cause: unknown) => {
        setAuthorized((current) => current === null ? false : current);
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar los datos.");
      })
      .finally(() => setLoading(false));
    return () => {
      active = false;
      socket?.disconnect();
    };
  }, [loadData, tab]);

  const counts = useMemo(() => ({
    pending: orders.filter((order) => order.status === "pending").length,
    processing: orders.filter((order) => order.status === "processing").length,
    delivered: orders.filter((order) => order.status === "delivered").length,
    total: orders.length,
  }), [orders]);

  if (!loading && authorized === false) {
    return <main className="page-shell"><div className="notice notice-error">{error}<p><Link href="/">Volver a la tienda <ArrowRight size={14} /></Link></p></div></main>;
  }

  async function changeStatus(orderId: string, status: OrderStatus) {
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar el pedido.");
      setOrders((current) => current.map((order) => order._id === orderId ? { ...order, status } : order));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el pedido.");
      await loadData("orders");
    } finally {
      setDraggedOrder(null);
    }
  }

  async function saveBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          author: form.get("author"),
          description: form.get("description"),
          category: form.get("category"),
          priceCents: Math.round(Number(form.get("price")) * 100),
          ...(form.get("assetFileName") ? { assetFileName: form.get("assetFileName") } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el libro.");
      event.currentTarget.reset();
      setBooks((current) => [data.book, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el libro.");
    }
  }

  async function archiveBook(bookId: string) {
    if (!window.confirm("¿Retirar este libro del catálogo?")) return;
    const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo retirar el libro.");
      return;
    }
    setBooks((current) => current.filter((book) => book._id !== bookId));
  }

  async function updateUser(userId: string, update: { role?: User["role"]; active?: boolean }) {
    const response = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...update }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo actualizar la cuenta.");
      return;
    }
    setUsers((current) => current.map((user) => user._id === userId ? data.user : user));
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-heading">
        <div><span className="eyebrow">CENTRO DE OPERACIONES</span><h1>Tu tienda, en movimiento.</h1><p>Gestiona pedidos, libros y personas desde un solo lugar.</p></div>
        <div className={`live-indicator ${connected ? "online" : ""}`}><Radio size={16} /><span>{connected ? "En vivo" : "Conectando…"}</span></div>
      </div>
      <div className="dashboard-stats">
        <article><span className="stat-icon stat-violet"><ShoppingBag size={18} /></span><div><span>Pedidos pagados</span><strong>{counts.total}</strong></div></article>
        <article><span className="stat-icon stat-amber"><Activity size={18} /></span><div><span>Por gestionar</span><strong>{counts.pending + counts.processing}</strong></div></article>
        <article><span className="stat-icon stat-green"><CheckCircle2 size={18} /></span><div><span>Entregados</span><strong>{counts.delivered}</strong></div></article>
        <article><span className="stat-icon stat-blue"><LibraryBig size={18} /></span><div><span>Libros activos</span><strong>{books.length || "—"}</strong></div></article>
      </div>
      <div className="dashboard-toolbar">
        <nav className="dashboard-tabs" aria-label="Secciones de gestión">
          <button className={tab === "orders" ? "selected" : ""} onClick={() => { setTab("orders"); setLoading(true); setError(""); }}><ShoppingBag size={16} /> Pedidos</button>
          <button className={tab === "catalog" ? "selected" : ""} onClick={() => { setTab("catalog"); setLoading(true); setError(""); }}><BookOpen size={16} /> Catálogo</button>
          <button className={tab === "users" ? "selected" : ""} onClick={() => { setTab("users"); setLoading(true); setError(""); }}><Users size={16} /> Usuarios</button>
        </nav>
        <span className="dashboard-helper"><GripVertical size={15} /> Arrastra las tarjetas para actualizar</span>
      </div>
      {error && <div role="alert" className="notice notice-error dashboard-error"><X size={16} /> {error}</div>}
      {loading ? <div className="loading-line"><LoaderCircle className="spin" /> Cargando…</div> : null}
      {!loading && tab === "orders" && (
        <div className="kanban-board">
          {columns.map((column) => {
            const columnOrders = orders.filter((order) => order.status === column.id);
            return (
              <section key={column.id} className="kanban-column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                event.preventDefault();
                if (draggedOrder) void changeStatus(draggedOrder, column.id);
              }}>
                <header className="kanban-column-header"><div><span className={`column-dot dot-${column.id}`} /><h2>{column.title}</h2><span className="column-count">{columnOrders.length}</span></div><p>{column.hint}</p></header>
                <div className="kanban-cards">
                  {columnOrders.map((order) => {
                    const customer = typeof order.userId === "object" ? order.userId : null;
                    return (
                      <article key={order._id} className={`order-card ${draggedOrder === order._id ? "dragging" : ""}`} draggable onDragStart={() => setDraggedOrder(order._id)} onDragEnd={() => setDraggedOrder(null)}>
                        <div className="order-card-top"><span>#{order._id.slice(-7).toUpperCase()}</span><span>{new Date(order.createdAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</span></div>
                        <h3>{customer?.name ?? "Cliente"}</h3>
                        <p className="order-email">{order.deliveryEmail}</p>
                        <div className="order-card-items">{order.items.map((item, index) => <span key={`${item.bookId}-${index}`}>{item.title}{item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>)}</div>
                        <div className="order-card-bottom"><strong>{money.format(order.totalCents / 100)}</strong><span><CircleUserRound size={14} /> PayPal</span></div>
                        <label className="sr-only" htmlFor={`status-${order._id}`}>Estado de pedido</label>
                        <select id={`status-${order._id}`} className="order-status-select" value={order.status} onChange={(event) => void changeStatus(order._id, event.target.value as OrderStatus)}>
                          {columns.map((option) => <option key={option.id} value={option.id}>{statusNames[option.id]}</option>)}
                        </select>
                      </article>
                    );
                  })}
                  {!columnOrders.length && <div className="kanban-empty">Sin pedidos por ahora</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {!loading && tab === "catalog" && (
        <div className="manage-layout">
          <section className="manage-panel">
            <div className="manage-panel-heading"><span className="stat-icon stat-violet"><Plus size={18} /></span><div><h2>Agregar un libro</h2><p>Completa la información del catálogo.</p></div></div>
            <form className="manage-form" onSubmit={saveBook}>
              <label>Título<input name="title" required maxLength={160} /></label>
              <label>Autor<input name="author" required maxLength={120} /></label>
              <label>Categoría<input name="category" required maxLength={80} placeholder="Novela, negocio…" /></label>
              <label>Precio (USD)<input name="price" type="number" step="0.01" min="0.01" required /></label>
              <label>Archivo digital (opcional)<input name="assetFileName" placeholder="mi-libro.pdf o mi-libro.epub" pattern="[A-Za-z0-9._ -]+[.](pdf|epub)" /></label>
              <label>Descripción<textarea name="description" rows={3} required maxLength={2000} /></label>
              <button className="primary-button" type="submit">Guardar libro <ArrowRight size={16} /></button>
            </form>
          </section>
          <section className="manage-panel manage-list-panel"><div className="manage-panel-heading"><div><h2>Libros en catálogo</h2><p>{books.length} títulos disponibles</p></div></div>
            <div className="manage-list">{books.map((book) => <article key={book._id} className="manage-list-item"><span className="library-book-icon"><BookOpen size={18} /></span><div><h3>{book.title}</h3><p>{book.author} · {book.category}</p></div><strong>{money.format(book.priceCents / 100)}</strong><button className="subtle-danger" onClick={() => void archiveBook(book._id)}>Retirar</button></article>)}</div>
          </section>
        </div>
      )}
      {!loading && tab === "users" && (
        <section className="manage-panel users-panel"><div className="manage-panel-heading"><span className="stat-icon stat-blue"><Users size={18} /></span><div><h2>Usuarios</h2><p>Gestiona accesos y permisos de la tienda.</p></div></div>
          <div className="user-table">
            <div className="user-table-head"><span>Cuenta</span><span>Rol</span><span>Estado</span><span>Acciones</span></div>
            {users.map((user) => <div className={`user-table-row ${!user.active ? "user-inactive" : ""}`} key={user._id}>
              <div className="user-cell"><span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>
              <span className={`role-label ${user.role}`}>{user.role === "staff" ? <><Shield size={13} /> Empleado</> : <><CircleUserRound size={13} /> Cliente</>}</span>
              <span className={`account-status ${user.active ? "active" : ""}`}>{user.active ? "Activa" : "Suspendida"}</span>
              <div className="user-actions"><select aria-label={`Rol para ${user.name}`} value={user.role} onChange={(event) => void updateUser(user._id, { role: event.target.value as User["role"] })}><option value="client">Cliente</option><option value="staff">Empleado</option></select><button className="subtle-button" onClick={() => void updateUser(user._id, { active: !user.active })}>{user.active ? "Suspender" : "Reactivar"}</button></div>
            </div>)}
          </div>
        </section>
      )}
      <footer className="dashboard-footer"><span>© E-book Store · Panel de gestión</span><Link href="/">Ver tienda <ArrowRight size={14} /></Link></footer>
    </main>
  );
}
