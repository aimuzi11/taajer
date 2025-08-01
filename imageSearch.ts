import OpenAI from "openai";
import Fuse from "fuse.js";
import { storage } from "../storage";
import { type Product } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ImageAnalysis {
  objects: string[];
  colors: string[];
  materials: string[];
  categories: string[];
  description: string;
  style?: string;
  brand?: string;
}

// Enhanced image analysis with detailed extraction
async function analyzeImageWithAI(base64Image: string): Promise<ImageAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert product identifier. Analyze the image and extract detailed information for product matching. 
          
          Respond with JSON in this exact format:
          {
            "objects": ["list of main objects/items in the image"],
            "colors": ["primary colors present"],
            "materials": ["materials you can identify like plastic, metal, fabric, etc."],
            "categories": ["product categories this might belong to"],
            "description": "detailed description of what you see",
            "style": "style description if applicable",
            "brand": "brand name if visible"
          }
          
          Be thorough but focused on product-relevant details.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and extract all product-related information for matching with an e-commerce catalog."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    // Ensure all required fields exist
    return {
      objects: analysis.objects || [],
      colors: analysis.colors || [],
      materials: analysis.materials || [],
      categories: analysis.categories || [],
      description: analysis.description || '',
      style: analysis.style || '',
      brand: analysis.brand || ''
    };
  } catch (error) {
    console.error("OpenAI Vision API error:", error);
    throw new Error("Failed to analyze image");
  }
}

// Advanced product matching with multiple algorithms
function findMatchingProducts(analysis: ImageAnalysis, products: Product[]): Product[] {
  const matches: Array<{ product: Product; score: number; reasons: string[] }> = [];

  for (const product of products) {
    let score = 0;
    const reasons: string[] = [];

    // Create searchable text for the product
    const productText = [
      product.name,
      product.description,
      product.category || ''
    ].join(' ').toLowerCase();

    // 1. Direct object matching (highest weight)
    const objectMatches = analysis.objects.filter(obj => 
      productText.includes(obj.toLowerCase())
    );
    if (objectMatches.length > 0) {
      score += objectMatches.length * 40;
      reasons.push(`Matches objects: ${objectMatches.join(', ')}`);
    }

    // 2. Category matching
    const categoryMatches = analysis.categories.filter(cat =>
      productText.includes(cat.toLowerCase()) || 
      (product.category && product.category.toLowerCase().includes(cat.toLowerCase()))
    );
    if (categoryMatches.length > 0) {
      score += categoryMatches.length * 30;
      reasons.push(`Matches categories: ${categoryMatches.join(', ')}`);
    }

    // 3. Color matching
    const colorMatches = analysis.colors.filter(color =>
      productText.includes(color.toLowerCase())
    );
    if (colorMatches.length > 0) {
      score += colorMatches.length * 20;
      reasons.push(`Matches colors: ${colorMatches.join(', ')}`);
    }

    // 4. Material matching
    const materialMatches = analysis.materials.filter(material =>
      productText.includes(material.toLowerCase())
    );
    if (materialMatches.length > 0) {
      score += materialMatches.length * 15;
      reasons.push(`Matches materials: ${materialMatches.join(', ')}`);
    }

    // 5. Brand matching (if detected)
    if (analysis.brand && productText.includes(analysis.brand.toLowerCase())) {
      score += 50;
      reasons.push(`Brand match: ${analysis.brand}`);
    }

    // 6. Fuzzy text matching using Fuse.js - check against all analysis fields
    const analysisText = [
      analysis.description,
      ...analysis.objects,
      ...analysis.categories,
      ...analysis.colors,
      ...analysis.materials
    ].join(' ');

    const fuse = new Fuse([productText], {
      threshold: 0.6, // Very lenient matching
      includeScore: true
    });

    const fuzzyResults = fuse.search(analysisText);
    if (fuzzyResults.length > 0 && fuzzyResults[0].score && fuzzyResults[0].score < 0.7) {
      const fuzzyScore = Math.round((1 - fuzzyResults[0].score) * 30);
      score += fuzzyScore;
      reasons.push(`Text similarity match (${Math.round((1 - fuzzyResults[0].score) * 100)}% similar)`);
    }

    // 7. Fallback: if catalog is very small, give some score to ensure results
    if (products.length <= 5 && score === 0) {
      score = 10;
      reasons.push('Included due to small catalog size');
    }

    // Include products with any positive score, or all products if catalog is small
    if (score > 5 || products.length <= 3) {
      matches.push({ product, score, reasons });
    }
  }

  // Sort by score (highest first) and return top matches
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Return top 8 matches
    .map(match => {
      console.log(`Product: ${match.product.name} - Score: ${match.score} - Reasons: ${match.reasons.join('; ')}`);
      return match.product;
    });
}

export async function searchProductsByImage(base64Image: string): Promise<Product[]> {
  try {
    // Get all available products
    const products = await storage.getAvailableProducts();
    
    if (products.length === 0) {
      console.log("No products available in catalog");
      return [];
    }

    console.log(`Analyzing image against ${products.length} products`);
    console.log("Available products:", products.map(p => ({ name: p.name, category: p.category, description: p.description.substring(0, 50) + '...' })));

    // Analyze the uploaded image
    const analysis = await analyzeImageWithAI(base64Image);
    console.log("Image analysis:", analysis);

    // Find matching products
    const matches = findMatchingProducts(analysis, products);
    
    console.log(`Found ${matches.length} matching products`);
    return matches;

  } catch (error) {
    console.error("Image search error:", error);
    throw error;
  }
}