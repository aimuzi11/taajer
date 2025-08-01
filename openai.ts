import OpenAI from "openai";
import { storage } from "../storage";
import { type Product } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function generateChatResponse(messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  try {
    // Get active assistant personality settings
    const assistantSettings = await storage.getActiveAssistantSettings();
    
    // Get the last user message for knowledge base search
    const lastUserMessage = messages.filter(m => m.role === "user").pop();
    let knowledgeContext = "";
    let productContext = "";

    if (lastUserMessage) {
      // Search knowledge base for relevant information - ALWAYS include this
      const relevantKnowledge = await storage.searchKnowledgeBase(lastUserMessage.content);
      
      if (relevantKnowledge.length > 0) {
        knowledgeContext = "\n\nRelevant information from knowledge base:\n" +
          relevantKnowledge.slice(0, 3) // Limit to top 3 results
            .map(kb => `- ${kb.title}: ${kb.content}`)
            .join("\n");
      }

      // ALWAYS get available products and include them in context
      const availableProducts = await storage.getAvailableProducts();
      
      if (availableProducts.length > 0) {
        productContext = "\n\nAvailable products for purchase:\n" +
          availableProducts.slice(0, 5) // Limit to top 5 products
            .map(product => `- ${product.name}: ${product.description} - $${parseFloat(product.price).toFixed(2)}${product.category ? ` (${product.category})` : ''} [ID: ${product.id}]`)
            .join("\n") +
          "\n\nUsers can purchase products through the shopping cart icon in the chat interface." +
          "\n\nIMPORTANT: When users ask to see product images, show pictures, or display photos, include [IMAGE:PRODUCT_NAME] in your response where you want the image to appear. For example: 'Here's the iPhone 15 Pro: [IMAGE:iPhone 15 Pro]' or 'Let me show you this product: [IMAGE:Wireless Headphones]'";
      }
    }

    // Build system message with personality and instructions
    let systemMessage = "";
    
    if (assistantSettings) {
      // Use custom personality settings
      systemMessage = `${assistantSettings.personality}

${assistantSettings.instructions}

IMPORTANT: Always respond using information from the knowledge base and product database. When users ask questions, search your knowledge base first. When they show interest in products or purchasing, mention available products.`;
    } else {
      // Default personality
      systemMessage = `You are a helpful AI assistant and sales assistant. You can help users with questions and also assist them in purchasing products. Be friendly, professional, and helpful.

IMPORTANT: Always respond using information from the knowledge base and product database first. When users ask questions, provide answers based on your knowledge base. When they show interest in products, guide them through available products.

SPECIAL INSTRUCTION: When users ask to see product images, show pictures, or display photos, include [IMAGE:PRODUCT_NAME] in your response where you want the image to appear. This will automatically display the product image in the chat.`;
    }

    // Always append knowledge and product context
    systemMessage += knowledgeContext + productContext;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        ...messages
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
}

export async function analyzeImageForProducts(imageBase64: string, availableProducts: Product[]): Promise<Product[]> {
  try {
    // Create a product catalog context for the AI
    const productCatalog = availableProducts.map(product => 
      `${product.name}: ${product.description} - $${parseFloat(product.price).toFixed(2)}${product.category ? ` (${product.category})` : ''}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a product matching AI. Analyze the uploaded image and find matching products from the available catalog.

Available Products:
${productCatalog}

Instructions:
1. Analyze the image to identify objects, colors, categories, and features
2. Match the identified items with products from the catalog
3. Return a JSON array of product names that match what you see in the image
4. Consider partial matches (e.g., similar colors, categories, functions)
5. Prioritize exact matches but include relevant alternatives
6. If no matches found, return an empty array

Return ONLY a JSON array of product names that match, like: ["Product Name 1", "Product Name 2"]`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and find matching products from the catalog:"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const aiResponse = response.choices[0].message.content || "[]";
    
    try {
      const matchedProductNames = JSON.parse(aiResponse);
      
      // Filter available products to return only the matched ones
      const matchedProducts = availableProducts.filter(product => 
        matchedProductNames.includes(product.name)
      );
      
      return matchedProducts;
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return [];
    }
  } catch (error) {
    console.error("OpenAI Vision API error:", error);
    throw new Error("Failed to analyze image");
  }
}
