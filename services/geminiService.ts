import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel 환경 변수에서 API 키를 가져옵니다.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  async chatWithGrounding(prompt: string, history: { role: string; content: string }[]) {
    // 404 에러 방지를 위해 가장 안정적인 모델명을 명시적으로 지정합니다.
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
      },
    });

    try {
      const result = await chatSession.sendMessage(prompt);
      const response = result.response;
      const text = response.text();
      
      // 검색 출처(Grounding) 정보 추출
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || '공식 문서'
      })).filter((s: any) => s.uri) || [];

      return { text, sources };
    } catch (error: any) {
      console.error("AI 호출 상세 에러:", error);
      throw error;
    }
  }
}

export const gemini = new GeminiService();
