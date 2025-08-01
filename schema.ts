import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index, boolean, serial, decimal, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with email authentication
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar("country", { length: 50 }).default("US"),
  dateOfBirth: timestamp("date_of_birth"),
  preferences: jsonb("preferences"), // Store user preferences as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User context and memory for personalized recommendations
export const userContext = pgTable("user_context", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contextType: text("context_type").notNull(), // 'purchase_history', 'browsing_behavior', 'preferences', etc.
  contextData: jsonb("context_data").notNull(), // Store contextual information as JSON
  weight: text("weight").default("1.0"), // Importance weight for recommendations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User recommendations based on context and algorithms
export const userRecommendations = pgTable("user_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  score: text("score").notNull(), // Recommendation score (0.0 - 1.0)
  reason: text("reason"), // Why this was recommended
  algorithm: text("algorithm").notNull(), // Which algorithm generated this
  isViewed: boolean("is_viewed").default(false),
  isInteracted: boolean("is_interacted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Recommendations can expire
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category"),
  tags: text("tags").array(),
  isActive: text("is_active", { enum: ["active", "inactive"] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(), // Store as string to avoid decimal precision issues - now in AED
  category: text("category"),
  imageUrl: text("image_url"), // Primary image URL - kept for backward compatibility
  images: text("images").array().default(sql`ARRAY[]::text[]`), // Array of image URLs
  isAvailable: text("is_available", { enum: ["available", "unavailable"] }).default("available").notNull(),
  stockQuantity: text("stock_quantity"), // Store as string, nullable for unlimited
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: text("quantity").notNull(),
  totalPrice: text("total_price").notNull(),
  customerInfo: text("customer_info"), // JSON string with name, email, etc.
  status: text("status", { enum: ["pending", "confirmed", "cancelled"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Assistant personality settings
export const assistantSettings = pgTable("assistant_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  personality: text("personality").notNull(),
  instructions: text("instructions").notNull(),
  isActive: text("is_active", { enum: ["active", "inactive"] }).default("inactive").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  phoneNumber: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  dateOfBirth: true,
  preferences: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const userProfileUpdateSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  phoneNumber: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  dateOfBirth: true,
  preferences: true,
});

export const insertUserContextSchema = createInsertSchema(userContext).pick({
  userId: true,
  contextType: true,
  contextData: true,
  weight: true,
});

export const insertUserRecommendationSchema = createInsertSchema(userRecommendations).omit({
  id: true,
  isViewed: true,
  isInteracted: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  role: true,
  sessionId: true,
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).pick({
  title: true,
  content: true,
  category: true,
  tags: true,
  isActive: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  price: true,
  category: true,
  imageUrl: true,
  images: true,
  isAvailable: true,
  stockQuantity: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  sessionId: true,
  productId: true,
  quantity: true,
  totalPrice: true,
  customerInfo: true,
  status: true,
});

export const insertAssistantSettingsSchema = createInsertSchema(assistantSettings).pick({
  name: true,
  personality: true,
  instructions: true,
  isActive: true,
});

export const adminLoginSchema = z.object({
  code: z.string().min(1, "Access code is required"),
});

export const purchaseRequestSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.string().min(1, "Quantity is required"),
  customerInfo: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type User = typeof users.$inferSelect;
export type InsertUserContext = z.infer<typeof insertUserContextSchema>;
export type UserContext = typeof userContext.$inferSelect;
export type InsertUserRecommendation = z.infer<typeof insertUserRecommendationSchema>;
export type UserRecommendation = typeof userRecommendations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertAssistantSettings = z.infer<typeof insertAssistantSettingsSchema>;
export type AssistantSettings = typeof assistantSettings.$inferSelect;

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
