import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // Vercel의 Key 이름과 일치해야 함
const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  async chatWithGrounding(prompt: string, history: { role: string; content: string }[]) {
    // 가장 안정적인 gemini-1.5-flash 모델 사용
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chatSession = model.startChat({
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      // 구글 검색 기능 활성화
      tools: [{ googleSearchRetrieval: {} } as any],
    });

    try {
      const result = await chatSession.sendMessage(prompt);
      const text = result.response.text();
      const sources = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || '공식 문서'
      })).filter((s: any) => s.uri) || [];

      return { text, sources };
    } catch (error) {
      console.error("AI 호출 에러:", error);
      throw error;
    }
  }
}

export const gemini = new GeminiService();
