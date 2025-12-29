
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async explainMutualStructure(targetDesc: string, guidanceDesc: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explain how "Mutual Structure-preserving Texture Filtering" would benefit these two images: 
      1. Target: ${targetDesc}
      2. Guidance: ${guidanceDesc}
      
      The goal is to keep edges present in both while removing texture. Keep it brief and professional.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  }
}
