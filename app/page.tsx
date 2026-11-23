import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpenCheck, CloudDownload, Sparkles } from "lucide-react";
import { BookCatalog } from "@/components/BookCatalog";

export default function HomePage() {
  return (
    <main>
      <section id="top" className="hero">
        <div className="hero-pattern" />
        <div className="hero-copy">
          <span className="hero-label"><Sparkles size={14} /> UN UNIVERSO DE HISTORIAS, A UN CLIC</span>
          <h1>Tu próxima gran<br />lectura <em>te espera.</em></h1>
          <p>Ideas que inspiran, historias que conectan. Encuentra tu próximo libro favorito y llévalo contigo donde vayas.</p>
          <div className="hero-actions"><Link href="#catalog" className="primary-button">Explorar libros <ArrowRight size={17} /></Link><span><BookOpenCheck size={17} /> Lecturas para crecer</span></div>
          <div className="hero-footnote"><span className="hero-line" /> UNA BUENA HISTORIA CAMBIA TODO</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="hero-book book-back"><span>IDEAS<br />QUE<br />PERDURAN</span><small>LECTURA · 2025</small></div>
          <div className="hero-book book-front"><span className="hero-book-mark">E—S</span><strong>El arte<br />de empezar<br /><i>de nuevo</i></strong><small>UNA HISTORIA ORIGINAL</small></div>
          <span className="floating-note note-one"><Sparkles size={15} /> nuevas ideas</span>
          <span className="floating-note note-two"><CloudDownload size={15} /> para llevar</span>
          <span className="hero-art-caption">UNA BIBLIOTECA SIN FRONTERAS</span>
        </div>
        <a href="#catalog" className="scroll-cue" aria-label="Desplazarse al catálogo"><ArrowDown size={16} /></a>
        <div className="hero-index">01 <span>/</span> 04</div>
      </section>
      <div className="benefit-strip">
        <div><span className="benefit-icon"><CloudDownload size={18} /></span><span><strong>Entrega digital segura</strong><small>Descargas desde tu cuenta</small></span></div>
        <div><span className="benefit-icon"><BookOpenCheck size={18} /></span><span><strong>Tu biblioteca personal</strong><small>Accede desde cualquier lugar</small></span></div>
        <div><span className="benefit-icon"><Sparkles size={18} /></span><span><strong>Lecturas que inspiran</strong><small>Ideas para todos los días</small></span></div>
      </div>
      <BookCatalog />
      <footer className="store-footer">
        <Link href="/" className="brand"><span className="brand-mark"><BookOpenCheck size={18} /></span> e-book<span className="brand-accent">store</span></Link>
        <span>Lee a tu ritmo. Crece a tu manera.</span>
        <span>© {new Date().getFullYear()} E-book Store</span>
      </footer>
    </main>
  );
}
