import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../lib/db";
import { Book, User } from "../lib/models";

const books = [
  {
    title: "El mapa de las ideas",
    author: "Lucía Montes",
    category: "Creatividad",
    description: "Una guía práctica para encontrar conexiones nuevas y convertir ideas en proyectos con sentido.",
    priceCents: 1299,
    coverColor: "#466c5c",
  },
  {
    title: "Pequeños comienzos",
    author: "Daniel Ríos",
    category: "Bienestar",
    description: "Reflexiones sencillas para construir hábitos duraderos y avanzar con intención cada día.",
    priceCents: 999,
    coverColor: "#a3654e",
  },
  {
    title: "La casa junto al mar",
    author: "Clara Niebla",
    category: "Ficción",
    description: "Una historia íntima sobre los secretos familiares, los lugares que recordamos y volver a empezar.",
    priceCents: 1499,
    coverColor: "#536e8b",
  },
  {
    title: "Conversaciones que importan",
    author: "Mateo Sol",
    category: "Desarrollo personal",
    description: "Herramientas para escuchar mejor, compartir ideas con claridad y fortalecer tus relaciones.",
    priceCents: 1199,
    coverColor: "#876e48",
  },
];

const seedAccounts = [
  {
    name: "Empleado de prueba",
    email: (process.env.SEED_STAFF_EMAIL || "empleado@example.com").trim().toLowerCase(),
    password: process.env.SEED_STAFF_PASSWORD,
    role: "staff" as const,
  },
  {
    name: "Cliente de prueba 1",
    email: (process.env.SEED_CLIENT1_EMAIL || "cliente1@example.com").trim().toLowerCase(),
    password: process.env.SEED_CLIENT1_PASSWORD,
    role: "client" as const,
  },
  {
    name: "Cliente de prueba 2",
    email: (process.env.SEED_CLIENT2_EMAIL || "cliente2@example.com").trim().toLowerCase(),
    password: process.env.SEED_CLIENT2_PASSWORD,
    role: "client" as const,
  },
];

async function seed() {
  const hasSeedPasswords = seedAccounts.some((account) => Boolean(account.password));
  if (hasSeedPasswords && seedAccounts.some((account) => !account.password)) {
    throw new Error("Set all three seed account passwords, or leave all three unset.");
  }
  if (hasSeedPasswords && seedAccounts.some((account) => (account.password?.length ?? 0) < 10)) {
    throw new Error("All seed account passwords must contain at least 10 characters.");
  }
  if (new Set(seedAccounts.map((account) => account.email)).size !== seedAccounts.length) {
    throw new Error("Seed account emails must be unique.");
  }
  if (seedAccounts.some((account) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email))) {
    throw new Error("Seed account emails must be valid email addresses.");
  }

  await connectToDatabase();
  if (hasSeedPasswords) {
    for (const account of seedAccounts) {
      if (!account.password) throw new Error("Missing password for a seed account.");
      await User.findOneAndUpdate(
        { email: account.email },
        {
          name: account.name,
          email: account.email,
          passwordHash: await bcrypt.hash(account.password, 12),
          role: account.role,
          active: true,
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
    }
  }

  for (const book of books) {
    await Book.updateOne({ title: book.title }, { $setOnInsert: book }, { upsert: true });
  }

  console.log(`Seed complete: ${books.length} sample books are ready.`);
  if (hasSeedPasswords) {
    console.log("One employee and two client test accounts are ready.");
  } else {
    console.warn("Test accounts skipped. Set all three SEED_*_PASSWORD variables to create them.");
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Seed failed.", error);
    process.exit(1);
  });
