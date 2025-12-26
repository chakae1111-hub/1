import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel 설정에서 완벽하게 등록된 것을 확인한 키를 불러옵니다.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 초기화 시 v1(안정 버전)을 사용하도록 강제 설정합니다.
const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  async chatWithGrounding(prompt: string, history: { role: string; content: string }[]) {
    // 모델 호출 시 실험적 기능을 배제하고 표준 경로를 사용합니다.
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: 'v1' } // 이 줄이 404 v1beta 에러를 해결하는 핵심입니다.
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
      const text = result.response.text();
      return { text, sources: [] };
    } catch (error: any) {
      console.error("AI 호출 최종 에러:", error);
      throw error;
    }
  }
}

export const gemini = new GeminiService();
