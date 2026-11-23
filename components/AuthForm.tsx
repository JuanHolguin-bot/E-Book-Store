"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, BookOpen, LoaderCircle } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isRegister ? { name } : {}), email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
      window.dispatchEvent(new Event("auth-updated"));
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next?.startsWith("/") ? next : data.user.role === "staff" ? "/dashboard" : "/";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la solicitud.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="brand-mark"><BookOpen size={19} /></span> e-book<span className="brand-accent">store</span></Link>
        <span className="eyebrow">{isRegister ? "UNA BIBLIOTECA A TU MEDIDA" : "QUÉ BUENO TENERTE DE VUELTA"}</span>
        <h1>{isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h1>
        <p className="auth-description">{isRegister ? "Guarda tus lecturas y accede a tus libros desde cualquier lugar." : "Ingresa para continuar explorando tu biblioteca."}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <label>Nombre completo<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} /></label>
          )}
          <label>Correo electrónico<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Contraseña<input type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={isRegister ? 10 : 1} maxLength={72} /></label>
          {isRegister && <span className="field-hint">Usa al menos 10 caracteres.</span>}
          {error && <div role="alert" className="notice notice-error">{error}</div>}
          <button type="submit" className="primary-button auth-submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <>{isRegister ? "Crear cuenta" : "Ingresar"} <ArrowRight size={17} /></>}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes cuenta?"}{" "}
          <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Ingresar" : "Crear cuenta"}</Link>
        </p>
        <Link href="/" className="auth-back">← Volver al catálogo</Link>
      </section>
    </main>
  );
}
