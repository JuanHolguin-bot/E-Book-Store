"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Search, ShoppingBag } from "lucide-react";
import { addToCart } from "@/lib/cart";

interface Book {
  _id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  priceCents: number;
  coverColor: string;
}

const money = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" });

export function BookCatalog() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [addedBook, setAddedBook] = useState("");

  useEffect(() => {
    fetch("/api/books")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el catálogo.");
        setBooks(data.books);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Error al cargar el catálogo."))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => ["Todos", ...new Set(books.map((book) => book.category))], [books]);
  const filteredBooks = books.filter((book) => {
    const matchesSearch = `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (activeCategory === "Todos" || book.category === activeCategory);
  });

  function addBook(bookId: string) {
    addToCart(bookId);
    setAddedBook(bookId);
    window.setTimeout(() => setAddedBook(""), 1200);
  }

  return (
    <section id="catalog" className="catalog-section section-shell">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LECTURAS PARA CADA MOMENTO</span>
          <h2>Explora el catálogo</h2>
        </div>
        <label className="search-field">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar un libro..." />
        </label>
      </div>
      <div className="category-list" role="group" aria-label="Filtrar por categoría">
        {categories.map((category) => (
          <button
            key={category}
            className={`category-chip ${activeCategory === category ? "active" : ""}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      {error && <div className="notice notice-error">{error}</div>}
      {loading ? (
        <div className="book-grid" aria-label="Cargando catálogo">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="book-skeleton" />)}
        </div>
      ) : !error && filteredBooks.length === 0 ? (
        <div className="empty-state"><p>No encontramos libros con esos filtros.</p></div>
      ) : (
        <div className="book-grid">
          {filteredBooks.map((book, index) => (
            <article key={book._id} className="book-card" style={{ animationDelay: `${index * 70}ms` }}>
              <div className="book-cover" style={{ backgroundColor: book.coverColor }}>
                <div className="cover-glow" />
                <span className="cover-category">{book.category}</span>
                <div className="cover-copy">
                  <span className="cover-rule" />
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                </div>
                <span className="cover-edition">E-BOOK · DIGITAL EDITION</span>
              </div>
              <div className="book-card-content">
                <div className="book-card-copy">
                  <p className="book-author">{book.author}</p>
                  <h3>{book.title}</h3>
                </div>
                <p className="book-description">{book.description}</p>
                <div className="book-card-footer">
                  <span className="book-price">{money.format(book.priceCents / 100)}</span>
                  <button className={`add-button ${addedBook === book._id ? "added" : ""}`} onClick={() => addBook(book._id)}>
                    {addedBook === book._id ? <Check size={17} /> : <ShoppingBag size={17} />}
                    <span>{addedBook === book._id ? "Agregado" : "Añadir"}</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="catalog-note">
        <span>Una biblioteca que viaja contigo.</span>
        <a href="/#top">Volver arriba <ArrowUpRight size={14} /></a>
      </div>
    </section>
  );
}
