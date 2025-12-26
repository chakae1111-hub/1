import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  async chatWithGrounding(prompt: string, history: { role: string; content: string }[]) {
    // 404 에러 방지를 위해 가장 안정적인 모델명으로 지정합니다.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chatSession = model.startChat({
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
    });

    try {
      const result = await chatSession.sendMessage(prompt);
      return { text: result.response.text(), sources: [] };
    } catch (error) {
      console.error("AI 호출 에러:", error);
      throw error;
    }
  }
}

export const gemini = new GeminiService();
