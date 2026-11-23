"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { readCart, writeCart, type CartItem } from "@/lib/cart";

interface Book {
  _id: string;
  title: string;
  author: string;
  priceCents: number;
  coverColor: string;
}

interface SessionUser {
  email: string;
}

const money = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" });

export function Checkout() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const captureStarted = useRef(false);

  useEffect(() => {
    setCart(readCart());
    Promise.all([
      fetch("/api/books").then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el catálogo.");
        setBooks(data.books);
      }),
      fetch("/api/auth/me").then(async (response) => {
        const data = await response.json();
        setUser(data.user);
        if (data.user?.email) setDeliveryEmail(data.user.email);
      }),
    ])
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el checkout."))
      .finally(() => setLoading(false));

    const search = new URLSearchParams(window.location.search);
    if (search.get("payment") === "cancelled") setPaymentMessage("El pago se canceló. Tus libros siguen en el carrito.");
    const paypalOrderId = search.get("token");
    if (search.get("payment") === "success" && paypalOrderId && !captureStarted.current) {
      captureStarted.current = true;
      setPaymentMessage("Estamos confirmando tu pago de forma segura…");
      void fetch("/api/payments/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalOrderId }),
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "No se pudo confirmar el pago.");
          writeCart([]);
          setCart([]);
          setPaymentMessage("¡Pago confirmado! Tu reserva está lista y tus libros ya están en Mis libros.");
        })
        .catch((cause: unknown) => {
          setPaymentMessage(cause instanceof Error ? cause.message : "No se pudo confirmar el pago.");
        });
    }
  }, []);

  const cartBooks = useMemo(() => cart.flatMap((item) => {
    const book = books.find((entry) => entry._id === item.bookId);
    return book ? [{ ...item, book }] : [];
  }), [books, cart]);
  const totalCents = cartBooks.reduce((total, item) => total + item.book.priceCents * item.quantity, 0);

  function updateQuantity(bookId: string, quantity: number) {
    const next = quantity < 1 ? cart.filter((item) => item.bookId !== bookId) : cart.map((item) => item.bookId === bookId ? { ...item, quantity: Math.min(quantity, 10) } : item);
    setCart(next);
    writeCart(next);
  }

  async function startPayment() {
    setError("");
    setPaying(true);
    try {
      const response = await fetch("/api/payments/paypal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, deliveryEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent("/checkout")}`;
          return;
        }
        throw new Error(data.error || "No se pudo iniciar el pago.");
      }
      window.location.assign(data.approvalUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar el pago.");
      setPaying(false);
    }
  }

  if (loading) return <main className="page-shell checkout-loading"><LoaderCircle className="spin" /> Preparando tu carrito…</main>;

  return (
    <main className="page-shell">
      <div className="checkout-topline"><Link href="/#catalog" className="back-link"><ArrowLeft size={16} /> Seguir explorando</Link><span><LockKeyhole size={14} /> Compra segura</span></div>
      <div className="checkout-heading"><span className="eyebrow">CASI TUYOS</span><h1>Finaliza tu compra</h1><p>Tus próximos libros favoritos están a un paso.</p></div>
      {paymentMessage && (
        <div className={`payment-result ${paymentMessage.startsWith("¡") ? "success" : ""}`} role="status">
          {paymentMessage.startsWith("¡") && <CheckCircle2 size={20} />}{paymentMessage}
          {paymentMessage.startsWith("¡") && <Link href="/orders">Ver mis libros <ArrowRight size={15} /></Link>}
        </div>
      )}
      {!user && !paymentMessage.startsWith("¡") && <div className="notice notice-info">Para pagar, <Link href={`/login?next=${encodeURIComponent("/checkout")}`}>ingresa a tu cuenta</Link> o crea una nueva.</div>}
      {error && <div className="notice notice-error">{error}</div>}
      <div className="checkout-layout">
        <section className="checkout-items">
          <div className="checkout-section-title"><div><span className="step-number">01</span><h2>Tu selección</h2></div><span>{cartBooks.length} {cartBooks.length === 1 ? "título" : "títulos"}</span></div>
          {cartBooks.length === 0 ? (
            <div className="empty-cart"><p>Tu carrito está esperando una buena historia.</p><Link className="text-link" href="/#catalog">Explorar el catálogo <ArrowRight size={15} /></Link></div>
          ) : cartBooks.map(({ book, quantity }) => (
            <article key={book._id} className="checkout-book">
              <span className="mini-cover" style={{ backgroundColor: book.coverColor }}>{book.title.slice(0, 1)}</span>
              <div className="checkout-book-info"><h3>{book.title}</h3><span>{book.author}</span><b>{money.format(book.priceCents / 100)}</b></div>
              <div className="quantity-control">
                <button aria-label={`Quitar una unidad de ${book.title}`} onClick={() => updateQuantity(book._id, quantity - 1)}>{quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}</button>
                <span>{quantity}</span>
                <button aria-label={`Agregar una unidad de ${book.title}`} onClick={() => updateQuantity(book._id, quantity + 1)} disabled={quantity >= 10}><Plus size={14} /></button>
              </div>
            </article>
          ))}
          {cartBooks.length > 0 && (
            <div className="delivery-panel">
              <span className="step-number">02</span>
              <div><h2>Entrega digital</h2><p>Enviaremos tus libros a este correo.</p>
                <label className="field-label">Correo de entrega<input type="email" value={deliveryEmail} onChange={(event) => setDeliveryEmail(event.target.value)} placeholder="tu@correo.com" required /></label>
              </div>
            </div>
          )}
        </section>
        <aside className="order-summary">
          <span className="eyebrow">RESUMEN</span><h2>Tu pedido</h2>
          <div className="summary-line"><span>Subtotal</span><span>{money.format(totalCents / 100)}</span></div>
          <div className="summary-line"><span>Entrega digital</span><span className="free-label">Gratis</span></div>
          <div className="summary-total"><span>Total</span><strong>{money.format(totalCents / 100)}</strong></div>
          <button className="primary-button pay-button" onClick={startPayment} disabled={!cartBooks.length || !user || !deliveryEmail || paying || paymentMessage.startsWith("¡")}>
            {paying ? <><LoaderCircle className="spin" size={18} /> Conectando con PayPal</> : <>Pagar con PayPal <ArrowRight size={17} /></>}
          </button>
          <div className="secure-note"><ShieldCheck size={17} /><span>Pago protegido por PayPal. Tus datos de pago nunca pasan por nuestra tienda.</span></div>
          <p className="terms-note">Al continuar, confirmas la compra de contenido digital y la entrega al correo indicado.</p>
        </aside>
      </div>
    </main>
  );
}
