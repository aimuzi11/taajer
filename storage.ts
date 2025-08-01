import { users, userContext, userRecommendations, messages, knowledgeBase, adminSessions, products, orders, assistantSettings, type User, type InsertUser, type UpsertUser, type UserProfileUpdate, type UserContext, type InsertUserContext, type UserRecommendation, type InsertUserRecommendation, type Message, type InsertMessage, type KnowledgeBase, type InsertKnowledgeBase, type AdminSession, type Product, type InsertProduct, type Order, type InsertOrder, type AssistantSettings, type InsertAssistantSettings } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations for email authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUserProfile(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getAllUsersWithContext(): Promise<User[]>;
  
  // User context operations for personalization
  createUserContext(context: InsertUserContext): Promise<UserContext>;
  getUserContextByType(userId: number, contextType: string): Promise<UserContext[]>;
  updateUserContext(id: string, updates: Partial<InsertUserContext>): Promise<UserContext | undefined>;
  
  // User recommendation operations
  createUserRecommendation(rec: InsertUserRecommendation): Promise<UserRecommendation>;
  getUserRecommendations(userId: number): Promise<UserRecommendation[]>;
  clearUserRecommendations(userId: number): Promise<void>;
  markRecommendationViewed(id: string): Promise<void>;
  markRecommendationInteracted(id: string): Promise<void>;
  
  // Enhanced order operations
  getRecentOrders(days: number): Promise<Order[]>;
  
  // Message operations
  getMessagesBySession(sessionId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearMessagesForSession(sessionId: string): Promise<void>;
  
  // Knowledge base operations
  getAllKnowledgeBase(): Promise<KnowledgeBase[]>;
  getKnowledgeBaseById(id: string): Promise<KnowledgeBase | undefined>;
  createKnowledgeBase(kb: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledgeBase(id: string, kb: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase | undefined>;
  deleteKnowledgeBase(id: string): Promise<void>;
  searchKnowledgeBase(query: string): Promise<KnowledgeBase[]>;
  
  // Admin session operations
  createAdminSession(expiresAt: Date): Promise<AdminSession>;
  getAdminSession(token: string): Promise<AdminSession | undefined>;
  deleteAdminSession(token: string): Promise<void>;
  
  // Product operations
  getAllProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  getAvailableProducts(): Promise<Product[]>;
  
  // Order operations
  getAllOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: "pending" | "confirmed" | "cancelled"): Promise<Order | undefined>;
  getOrdersBySession(sessionId: string): Promise<Order[]>;
  
  // Assistant settings operations
  getAllAssistantSettings(): Promise<AssistantSettings[]>;
  getActiveAssistantSettings(): Promise<AssistantSettings | undefined>;
  createAssistantSettings(settings: InsertAssistantSettings): Promise<AssistantSettings>;
  updateAssistantSettings(id: string, updates: Partial<InsertAssistantSettings>): Promise<AssistantSettings | undefined>;
  deleteAssistantSettings(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private usersByEmail: Map<string, User>;
  private userIdCounter: number = 1;
  private messages: Map<string, Message>;
  private knowledgeBase: Map<string, KnowledgeBase>;
  private adminSessions: Map<string, AdminSession>;
  private products: Map<string, Product>;
  private orders: Map<string, Order>;
  private assistantSettings: Map<string, AssistantSettings>;

  constructor() {
    this.users = new Map();
    this.usersByEmail = new Map();
    this.messages = new Map();
    this.knowledgeBase = new Map();
    this.adminSessions = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.assistantSettings = new Map();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email);
  }

  async createUser(userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    
    const user: User = {
      id,
      ...userData,
      phoneNumber: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      country: userData.country || "US",
      dateOfBirth: null,
      preferences: null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.users.set(id, user);
    this.usersByEmail.set(userData.email, user);
    return user;
  }

  async updateUserProfile(id: number, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    
    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.users.set(id, updated);
    if (updated.email !== existing.email) {
      this.usersByEmail.delete(existing.email);
      this.usersByEmail.set(updated.email, updated);
    }
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllUsersWithContext(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // User context operations
  async createUserContext(context: InsertUserContext): Promise<UserContext> {
    const id = randomUUID();
    const newContext: UserContext = {
      ...context,
      id,
      weight: context.weight || "1.0",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newContext;
  }

  async getUserContextByType(userId: number, contextType: string): Promise<UserContext[]> {
    return []; // Memory implementation placeholder
  }

  async updateUserContext(id: string, updates: Partial<InsertUserContext>): Promise<UserContext | undefined> {
    return undefined; // Memory implementation placeholder
  }

  // User recommendation operations
  async createUserRecommendation(rec: InsertUserRecommendation): Promise<UserRecommendation> {
    const id = randomUUID();
    const newRec: UserRecommendation = {
      ...rec,
      id,
      isViewed: false,
      isInteracted: false,
      createdAt: new Date(),
    };
    return newRec;
  }

  async getUserRecommendations(userId: number): Promise<UserRecommendation[]> {
    return []; // Memory implementation placeholder
  }

  async clearUserRecommendations(userId: number): Promise<void> {
    // Memory implementation placeholder
  }

  async markRecommendationViewed(id: string): Promise<void> {
    // Memory implementation placeholder
  }

  async markRecommendationInteracted(id: string): Promise<void> {
    // Memory implementation placeholder
  }

  async getRecentOrders(days: number): Promise<Order[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Array.from(this.orders.values())
      .filter(order => new Date(order.createdAt) > cutoffDate);
  }

  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async clearMessagesForSession(sessionId: string): Promise<void> {
    for (const [id, message] of Array.from(this.messages.entries())) {
      if (message.sessionId === sessionId) {
        this.messages.delete(id);
      }
    }
  }

  // Knowledge base operations
  async getAllKnowledgeBase(): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBase.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getKnowledgeBaseById(id: string): Promise<KnowledgeBase | undefined> {
    return this.knowledgeBase.get(id);
  }

  async createKnowledgeBase(insertKb: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const id = randomUUID();
    const now = new Date();
    const kb: KnowledgeBase = {
      ...insertKb,
      id,
      category: insertKb.category || null,
      tags: insertKb.tags || null,
      isActive: insertKb.isActive || "active",
      createdAt: now,
      updatedAt: now,
    };
    this.knowledgeBase.set(id, kb);
    return kb;
  }

  async updateKnowledgeBase(id: string, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase | undefined> {
    const existing = this.knowledgeBase.get(id);
    if (!existing) return undefined;
    
    const updated: KnowledgeBase = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.knowledgeBase.set(id, updated);
    return updated;
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    this.knowledgeBase.delete(id);
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeBase[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.knowledgeBase.values())
      .filter(kb => 
        kb.isActive === "active" && (
          kb.title.toLowerCase().includes(lowerQuery) ||
          kb.content.toLowerCase().includes(lowerQuery) ||
          kb.category?.toLowerCase().includes(lowerQuery) ||
          kb.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        )
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Admin session operations
  async createAdminSession(expiresAt: Date): Promise<AdminSession> {
    const id = randomUUID();
    const sessionToken = randomUUID();
    const session: AdminSession = {
      id,
      sessionToken,
      expiresAt,
      createdAt: new Date(),
    };
    this.adminSessions.set(sessionToken, session);
    return session;
  }

  async getAdminSession(token: string): Promise<AdminSession | undefined> {
    const session = this.adminSessions.get(token);
    if (!session) return undefined;
    
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.adminSessions.delete(token);
      return undefined;
    }
    
    return session;
  }

  async deleteAdminSession(token: string): Promise<void> {
    this.adminSessions.delete(token);
  }

  // Product operations
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const now = new Date();
    const product: Product = {
      ...insertProduct,
      id,
      category: insertProduct.category || null,
      imageUrl: insertProduct.imageUrl || null,
      stockQuantity: insertProduct.stockQuantity || null,
      isAvailable: insertProduct.isAvailable || "available",
      createdAt: now,
      updatedAt: now,
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    
    const updated: Product = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    this.products.delete(id);
  }

  async getAvailableProducts(): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(product => product.isAvailable === "available")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const now = new Date();
    const order: Order = {
      ...insertOrder,
      id,
      customerInfo: insertOrder.customerInfo || null,
      status: insertOrder.status || "pending",
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: string, status: "pending" | "confirmed" | "cancelled"): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;
    
    const updated: Order = {
      ...existing,
      status,
      updatedAt: new Date(),
    };
    this.orders.set(id, updated);
    return updated;
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Assistant settings operations
  async getAllAssistantSettings(): Promise<AssistantSettings[]> {
    return Array.from(this.assistantSettings.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getActiveAssistantSettings(): Promise<AssistantSettings | undefined> {
    return Array.from(this.assistantSettings.values())
      .find(setting => setting.isActive === "active");
  }

  async createAssistantSettings(insertSettings: InsertAssistantSettings): Promise<AssistantSettings> {
    const id = randomUUID();
    const now = new Date();
    
    // Set all other settings to inactive when creating a new active one
    if (insertSettings.isActive === "active") {
      Array.from(this.assistantSettings.values()).forEach(setting => {
        if (setting.isActive === "active") {
          setting.isActive = "inactive";
        }
      });
    }
    
    const settings: AssistantSettings = {
      ...insertSettings,
      id,
      isActive: insertSettings.isActive || "inactive",
      createdAt: now,
      updatedAt: now,
    };
    this.assistantSettings.set(id, settings);
    return settings;
  }

  async updateAssistantSettings(id: string, updates: Partial<InsertAssistantSettings>): Promise<AssistantSettings | undefined> {
    const existing = this.assistantSettings.get(id);
    if (!existing) return undefined;
    
    // Set all other settings to inactive when activating this one
    if (updates.isActive === "active") {
      Array.from(this.assistantSettings.values()).forEach(setting => {
        if (setting.id !== id && setting.isActive === "active") {
          setting.isActive = "inactive";
        }
      });
    }
    
    const updated: AssistantSettings = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.assistantSettings.set(id, updated);
    return updated;
  }

  async deleteAssistantSettings(id: string): Promise<void> {
    this.assistantSettings.delete(id);
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: number, updates: Partial<User>): Promise<User | undefined> {
    // Clean up the updates object to ensure proper types
    const cleanUpdates: any = { ...updates };
    
    // Handle dateOfBirth - convert string to Date if needed
    if (cleanUpdates.dateOfBirth && typeof cleanUpdates.dateOfBirth === 'string') {
      cleanUpdates.dateOfBirth = new Date(cleanUpdates.dateOfBirth);
    }
    
    const [updated] = await db
      .update(users)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllUsersWithContext(): Promise<User[]> {
    return await db.select().from(users);
  }

  // User context operations for personalization
  async createUserContext(context: InsertUserContext): Promise<UserContext> {
    const [newContext] = await db
      .insert(userContext)
      .values({
        ...context,
        id: crypto.randomUUID(),
        weight: context.weight || "1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newContext;
  }

  async getUserContextByType(userId: number, contextType: string): Promise<UserContext[]> {
    return await db
      .select()
      .from(userContext)
      .where(and(eq(userContext.userId, userId), eq(userContext.contextType, contextType)));
  }

  async updateUserContext(id: string, updates: Partial<InsertUserContext>): Promise<UserContext | undefined> {
    const [updated] = await db
      .update(userContext)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userContext.id, id))
      .returning();
    return updated || undefined;
  }

  // User recommendation operations
  async createUserRecommendation(rec: InsertUserRecommendation): Promise<UserRecommendation> {
    const [newRec] = await db
      .insert(userRecommendations)
      .values({
        ...rec,
        id: crypto.randomUUID(),
        reason: rec.reason || null,
        isViewed: false,
        isInteracted: false,
        createdAt: new Date(),
      })
      .returning();
    return newRec;
  }

  async getUserRecommendations(userId: number): Promise<UserRecommendation[]> {
    return await db
      .select()
      .from(userRecommendations)
      .where(eq(userRecommendations.userId, userId))
      .orderBy(desc(userRecommendations.createdAt));
  }

  async clearUserRecommendations(userId: number): Promise<void> {
    await db.delete(userRecommendations).where(eq(userRecommendations.userId, userId));
  }

  async markRecommendationViewed(id: string): Promise<void> {
    await db
      .update(userRecommendations)
      .set({ isViewed: true })
      .where(eq(userRecommendations.id, id));
  }

  async markRecommendationInteracted(id: string): Promise<void> {
    await db
      .update(userRecommendations)
      .set({ isInteracted: true })
      .where(eq(userRecommendations.id, id));
  }

  async getRecentOrders(days: number): Promise<Order[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await db
      .select()
      .from(orders)
      .where(eq(orders.createdAt, cutoffDate))
      .orderBy(desc(orders.createdAt));
  }

  // Message operations
  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async clearMessagesForSession(sessionId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.sessionId, sessionId));
  }

  // Knowledge base operations
  async getAllKnowledgeBase(): Promise<KnowledgeBase[]> {
    return await db
      .select()
      .from(knowledgeBase)
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async getKnowledgeBaseById(id: string): Promise<KnowledgeBase | undefined> {
    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
    return kb || undefined;
  }

  async createKnowledgeBase(insertKb: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [kb] = await db
      .insert(knowledgeBase)
      .values(insertKb)
      .returning();
    return kb;
  }

  async updateKnowledgeBase(id: string, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase | undefined> {
    const [updated] = await db
      .update(knowledgeBase)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeBase[]> {
    return await db
      .select()
      .from(knowledgeBase)
      .where(
        and(
          eq(knowledgeBase.isActive, "active"),
          or(
            ilike(knowledgeBase.title, `%${query}%`),
            ilike(knowledgeBase.content, `%${query}%`),
            ilike(knowledgeBase.category, `%${query}%`)
          )
        )
      )
      .orderBy(desc(knowledgeBase.updatedAt));
  }

  // Admin session operations
  async createAdminSession(expiresAt: Date): Promise<AdminSession> {
    const [session] = await db
      .insert(adminSessions)
      .values({ 
        sessionToken: randomUUID(), 
        expiresAt 
      })
      .returning();
    return session;
  }

  async getAdminSession(token: string): Promise<AdminSession | undefined> {
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(eq(adminSessions.sessionToken, token));
    
    if (!session) return undefined;
    
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await this.deleteAdminSession(token);
      return undefined;
    }
    
    return session;
  }

  async deleteAdminSession(token: string): Promise<void> {
    await db.delete(adminSessions).where(eq(adminSessions.sessionToken, token));
  }

  // Product operations
  async getAllProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getAvailableProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.isAvailable, "available"))
      .orderBy(desc(products.updatedAt));
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values(insertOrder)
      .returning();
    return order;
  }

  async updateOrderStatus(id: string, status: "pending" | "confirmed" | "cancelled"): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.sessionId, sessionId))
      .orderBy(desc(orders.createdAt));
  }

  // Assistant settings operations
  async getAllAssistantSettings(): Promise<AssistantSettings[]> {
    return await db
      .select()
      .from(assistantSettings)
      .orderBy(desc(assistantSettings.updatedAt));
  }

  async getActiveAssistantSettings(): Promise<AssistantSettings | undefined> {
    const [settings] = await db
      .select()
      .from(assistantSettings)
      .where(eq(assistantSettings.isActive, "active"))
      .limit(1);
    return settings || undefined;
  }

  async createAssistantSettings(insertSettings: InsertAssistantSettings): Promise<AssistantSettings> {
    // Set all other settings to inactive when creating a new active one
    if (insertSettings.isActive === "active") {
      await db
        .update(assistantSettings)
        .set({ isActive: "inactive", updatedAt: new Date() })
        .where(eq(assistantSettings.isActive, "active"));
    }

    const [settings] = await db
      .insert(assistantSettings)
      .values(insertSettings)
      .returning();
    return settings;
  }

  async updateAssistantSettings(id: string, updates: Partial<InsertAssistantSettings>): Promise<AssistantSettings | undefined> {
    // Set all other settings to inactive when activating this one
    if (updates.isActive === "active") {
      await db
        .update(assistantSettings)
        .set({ isActive: "inactive", updatedAt: new Date() })
        .where(eq(assistantSettings.isActive, "active"));
    }

    const [updated] = await db
      .update(assistantSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assistantSettings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAssistantSettings(id: string): Promise<void> {
    await db.delete(assistantSettings).where(eq(assistantSettings.id, id));
  }
}

export const storage = new DatabaseStorage();
