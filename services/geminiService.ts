import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// 프리뷰 모델은 보통 v1beta 경로에서 작동하므로 이를 명시합니다.
const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  async chatWithGrounding(prompt: string, history: { role: string; content: string }[]) {
    // AI 스튜디오 설정(image_86725c.png)에 맞춰 모델명을 변경합니다.
    const model = genAI.getGenerativeModel(
      { model: "gemini-3-flash-preview" },
      { apiVersion: "v1beta" }
    );

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
      const response = await result.response;
      return { text: response.text(), sources: [] };
    } catch (error: any) {
      console.error("AI 호출 최종 에러 상세:", error);
      throw error;
    }
  }
}

export const gemini = new GeminiService();
