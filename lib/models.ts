import mongoose, { Schema, Types } from "mongoose";

export type UserRole = "client" | "staff";
export type FulfillmentStatus = "pending" | "processing" | "sent" | "delivered";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface UserDocument extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["client", "staff"], default: "client", required: true },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export interface BookDocument extends mongoose.Document {
  title: string;
  author: string;
  description: string;
  category: string;
  priceCents: number;
  coverColor: string;
  assetFileName?: string;
  active: boolean;
}

const BookSchema = new Schema<BookDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    author: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    priceCents: { type: Number, required: true, min: 0 },
    coverColor: { type: String, default: "#233b35", match: /^#[0-9a-fA-F]{6}$/ },
    assetFileName: { type: String, trim: true },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export interface OrderItem {
  bookId: Types.ObjectId;
  title: string;
  author: string;
  priceCents: number;
  quantity: number;
  assetFileName?: string;
}

export interface OrderDocument extends mongoose.Document {
  userId: Types.ObjectId;
  items: OrderItem[];
  totalCents: number;
  currency: string;
  deliveryEmail: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  paymentStatus: PaymentStatus;
  status: FulfillmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<OrderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [
      {
        bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
        title: { type: String, required: true },
        author: { type: String, required: true },
        priceCents: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1, max: 10 },
        assetFileName: { type: String },
      },
    ],
    totalCents: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    deliveryEmail: { type: String, required: true, lowercase: true, trim: true },
    paypalOrderId: { type: String, required: true, unique: true },
    paypalCaptureId: { type: String },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "delivered"],
      default: "pending",
    },
  },
  { timestamps: true },
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, status: 1, createdAt: -1 });

export const User =
  (mongoose.models.User as mongoose.Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>("User", UserSchema);
export const Book =
  (mongoose.models.Book as mongoose.Model<BookDocument> | undefined) ??
  mongoose.model<BookDocument>("Book", BookSchema);
export const Order =
  (mongoose.models.Order as mongoose.Model<OrderDocument> | undefined) ??
  mongoose.model<OrderDocument>("Order", OrderSchema);
