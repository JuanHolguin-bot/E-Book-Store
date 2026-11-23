"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, LogOut, ShoppingBag } from "lucide-react";
import type { CartItem } from "@/lib/cart";
import { readCart } from "@/lib/cart";

interface SessionUser {
  name: string;
  role: "client" | "staff";
}

export function StoreHeader() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const refreshCart = () => {
      setCartCount(readCart().reduce((count: number, item: CartItem) => count + item.quantity, 0));
    };
    const loadUser = async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) return;
      const data = await response.json();
      setUser(data.user);
    };
    refreshCart();
    void loadUser();
    window.addEventListener("cart-updated", refreshCart);
    window.addEventListener("auth-updated", loadUser);
    return () => {
      window.removeEventListener("cart-updated", refreshCart);
      window.removeEventListener("auth-updated", loadUser);
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.dispatchEvent(new Event("auth-updated"));
    window.location.href = "/";
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="E-book Store, inicio">
          <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
          <span>e-book<span className="brand-accent">store</span></span>
        </Link>
        <nav className="main-nav" aria-label="Navegación principal">
          <Link href="/#catalog">Catálogo</Link>
          {user && <Link href="/orders">Mis libros</Link>}
          {user?.role === "staff" && <Link href="/dashboard">Gestión</Link>}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-greeting">Hola, {user.name.split(" ")[0]}</span>
              <button className="icon-button logout-button" onClick={logout} aria-label="Cerrar sesión">
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <Link href="/login" className="header-login">Ingresar</Link>
          )}
          <Link className="cart-button" href="/checkout" aria-label={`Carrito, ${cartCount} productos`}>
            <ShoppingBag size={18} />
            <span>Carrito</span>
            <span className="cart-count">{cartCount}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
