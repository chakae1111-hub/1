import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel 설정에 등록하신 키 이름을 정확히 읽어옵니다.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  async chatWithGrounding(prompt: string, history: { role: string; content: string }[]) {
    // 404 에러 방지를 위해 가장 범용적인 gemini-1.5-flash 모델을 선택합니다.
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
      const response = await result.response;
      const text = response.text();
      
      // 안정성을 위해 구글 검색(Grounding) 기능은 제외하고 텍스트 응답만 반환합니다.
      return { text, sources: [] };
    } catch (error: any) {
      console.error("AI 호출 상세 에러:", error);
      // 에러 발생 시 사용자에게 보여줄 메시지 처리를 위해 에러를 던집니다.
      throw error;
    }
  }
}

export const gemini = new GeminiService();
