import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { generateChatResponse } from "./services/openai";
import { searchProductsByImage } from "./services/imageSearch";
import { insertMessageSchema, insertKnowledgeBaseSchema, adminLoginSchema, insertProductSchema, insertOrderSchema, purchaseRequestSchema, insertAssistantSettingsSchema } from "@shared/schema";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().min(1),
});

const ADMIN_CODE = "aiman";

// Middleware to check admin authentication
const requireAdminAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const token = authHeader.substring(7);
  const session = await storage.getAdminSession(token);
  
  if (!session) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
  
  req.adminSession = session;
  next();
};

export function registerRoutes(app: Express): Server {
  // Setup email authentication
  setupAuth(app);

  // Auth routes are handled in setupAuth function
  // Additional authenticated routes below

  // Update user profile
  app.put('/api/user/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const updates = req.body;
      
      const updatedUser = await storage.updateUserProfile(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });


  
  // Get chat history for a session
  app.get("/api/chat/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getMessagesBySession(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // Send a new message and get AI response
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId } = chatRequestSchema.parse(req.body);

      // Save user message
      const userMessage = await storage.createMessage({
        content: message,
        role: "user",
        sessionId,
      });

      // Get conversation history for context
      const messageHistory = await storage.getMessagesBySession(sessionId);
      
      // Prepare messages for OpenAI (exclude the just-added user message to avoid duplication)
      const conversationContext = messageHistory
        .slice(0, -1) // Remove the last message (the one we just added)
        .map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }));

      // Add the current user message
      conversationContext.push({
        role: "user",
        content: message
      });

      // Generate AI response
      const aiResponse = await generateChatResponse(conversationContext);

      // Save AI message
      const aiMessage = await storage.createMessage({
        content: aiResponse,
        role: "assistant",
        sessionId,
      });

      res.json({
        userMessage,
        aiMessage,
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to process message" });
      }
    }
  });

  // Clear chat history for a session
  app.delete("/api/chat/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.clearMessagesForSession(sessionId);
      res.json({ message: "Chat history cleared" });
    } catch (error) {
      console.error("Error clearing chat history:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  // Enhanced reverse image search endpoint
  app.post("/api/image-search", async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ message: "Image data is required" });
      }

      console.log("Processing image search request...");
      
      // Use enhanced image search service
      const matchingProducts = await searchProductsByImage(image);
      
      console.log(`Returning ${matchingProducts.length} matching products`);
      res.json({ products: matchingProducts });
    } catch (error) {
      console.error("Error processing image search:", error);
      res.status(500).json({ message: "Failed to process image search" });
    }
  });

  // Admin Authentication Routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Check for specific admin credentials
      if (email !== "aiman@asolution.ai" || password !== "508540902") {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
      
      // Create session that expires in 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const session = await storage.createAdminSession(expiresAt);
      
      res.json({ 
        message: "Login successful",
        token: session.sessionToken,
        expiresAt: session.expiresAt
      });
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/logout", requireAdminAuth, async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader.substring(7);
      await storage.deleteAdminSession(token);
      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error during admin logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Knowledge Base Management Routes
  app.get("/api/admin/knowledge-base", requireAdminAuth, async (req, res) => {
    try {
      const knowledgeBase = await storage.getAllKnowledgeBase();
      res.json(knowledgeBase);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base" });
    }
  });

  app.post("/api/admin/knowledge-base", requireAdminAuth, async (req, res) => {
    try {
      const kbData = insertKnowledgeBaseSchema.parse(req.body);
      const newKb = await storage.createKnowledgeBase(kbData);
      res.json(newKb);
    } catch (error) {
      console.error("Error creating knowledge base entry:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create knowledge base entry" });
      }
    }
  });

  app.put("/api/admin/knowledge-base/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertKnowledgeBaseSchema.partial().parse(req.body);
      const updatedKb = await storage.updateKnowledgeBase(id, updates);
      
      if (!updatedKb) {
        return res.status(404).json({ message: "Knowledge base entry not found" });
      }
      
      res.json(updatedKb);
    } catch (error) {
      console.error("Error updating knowledge base entry:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update knowledge base entry" });
      }
    }
  });

  app.delete("/api/admin/knowledge-base/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteKnowledgeBase(id);
      res.json({ message: "Knowledge base entry deleted" });
    } catch (error) {
      console.error("Error deleting knowledge base entry:", error);
      res.status(500).json({ message: "Failed to delete knowledge base entry" });
    }
  });

  app.get("/api/admin/knowledge-base/search", requireAdminAuth, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const results = await storage.searchKnowledgeBase(q);
      res.json(results);
    } catch (error) {
      console.error("Error searching knowledge base:", error);
      res.status(500).json({ message: "Failed to search knowledge base" });
    }
  });

  // Product Management Routes
  app.get("/api/admin/products", requireAdminAuth, async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/admin/products", requireAdminAuth, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const newProduct = await storage.createProduct(productData);
      res.json(newProduct);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  app.put("/api/admin/products/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertProductSchema.partial().parse(req.body);
      const updatedProduct = await storage.updateProduct(id, updates);
      
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update product" });
      }
    }
  });

  app.delete("/api/admin/products/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Order Management Routes
  app.get("/api/admin/orders", requireAdminAuth, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.put("/api/admin/orders/:id/status", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = z.object({ status: z.enum(["pending", "confirmed", "cancelled"]) }).parse(req.body);
      
      const updatedOrder = await storage.updateOrderStatus(id, status);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update order status" });
      }
    }
  });

  // Public Product and Purchase Routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAvailableProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching available products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/purchase", async (req, res) => {
    try {
      const { productId, quantity, customerInfo, sessionId } = z.object({
        productId: z.string(),
        quantity: z.string(),
        customerInfo: z.object({
          name: z.string(),
          email: z.string().email(),
          phone: z.string().optional(),
          address: z.string().optional(),
        }),
        sessionId: z.string(),
      }).parse(req.body);

      // Get product details
      const product = await storage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.isAvailable !== "available") {
        return res.status(400).json({ message: "Product is not available" });
      }

      // Calculate total price
      const quantityNum = parseInt(quantity);
      const priceNum = parseFloat(product.price);
      const totalPrice = (quantityNum * priceNum).toFixed(2);

      // Create order
      const order = await storage.createOrder({
        sessionId,
        productId,
        quantity,
        totalPrice,
        customerInfo: JSON.stringify(customerInfo),
        status: "pending",
      });

      res.json({ 
        message: "Order placed successfully",
        order,
        product: {
          name: product.name,
          price: product.price,
        }
      });
    } catch (error) {
      console.error("Error processing purchase:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to process purchase" });
      }
    }
  });

  // Customer Management Routes
  app.get("/api/admin/customers", requireAdminAuth, async (req, res) => {
    try {
      const customers = await storage.getAllUsers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Assistant Settings Management Routes
  app.get("/api/admin/assistant-settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getAllAssistantSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching assistant settings:", error);
      res.status(500).json({ message: "Failed to fetch assistant settings" });
    }
  });

  app.get("/api/admin/assistant-settings/active", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getActiveAssistantSettings();
      res.json(settings || null);
    } catch (error) {
      console.error("Error fetching active assistant settings:", error);
      res.status(500).json({ message: "Failed to fetch active assistant settings" });
    }
  });

  app.post("/api/admin/assistant-settings", requireAdminAuth, async (req, res) => {
    try {
      const parsedData = insertAssistantSettingsSchema.parse(req.body);
      const settings = await storage.createAssistantSettings(parsedData);
      res.json(settings);
    } catch (error) {
      console.error("Error creating assistant settings:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create assistant settings" });
      }
    }
  });

  app.put("/api/admin/assistant-settings/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const parsedData = insertAssistantSettingsSchema.partial().parse(req.body);
      
      const updatedSettings = await storage.updateAssistantSettings(id, parsedData);
      
      if (!updatedSettings) {
        return res.status(404).json({ message: "Assistant settings not found" });
      }
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating assistant settings:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update assistant settings" });
      }
    }
  });

  app.delete("/api/admin/assistant-settings/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAssistantSettings(id);
      res.json({ message: "Assistant settings deleted" });
    } catch (error) {
      console.error("Error deleting assistant settings:", error);
      res.status(500).json({ message: "Failed to delete assistant settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
