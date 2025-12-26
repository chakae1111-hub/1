import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel 설정에 등록된 키를 안전하게 불러옵니다.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  async chatWithGrounding(prompt: string, history: { role: string; content: string }[]) {
    // 404 에러를 방지하기 위해 가장 표준적인 모델명을 사용합니다.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });

    const chatSession = model.startChat({
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
    });

    try {
      const result = await chatSession.sendMessage(prompt);
      // v1beta 경로 문제를 피하기 위해 response.text()를 직접 호출합니다.
      const text = result.response.text();
      
      return { text, sources: [] };
    } catch (error: any) {
      console.error("AI 호출 상세 에러:", error);
      throw error;
    }
  }
}

export const gemini = new GeminiService();
