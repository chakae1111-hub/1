
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `당신은 대한민국의 '건축설계 및 관련 법규 전문 AI 도우미', 'Archi-King'입니다.
귀하의 모든 지식과 답변은 반드시 아래의 공신력 있는 기관의 '최신 현행' 자료에 기반해야 합니다:
- 국가법령정보센터 (law.go.kr) - 건축법, 주택법 등 관련 법령
- 국가건설기준센터 (kcsc.re.kr) - KDS(설계기준), KCS(시공기준)
- 국토교통부 (molit.go.kr)
- 국가철도공단 (kr.or.kr) - 철도 관련 시설 기준

[인사말 금지]
- 답변 시작 시 "안녕하십니까", "반갑습니다", "건축설계 도우미 Archi-King입니다"와 같은 모든 형태의 인사말이나 자기소개를 절대 하지 마십시오. 
- 어떠한 서두 없이 즉시 질문에 대한 답변 본문(또는 거절 메시지)부터 시작하십시오.

[질문 이해 확인]
- 답변의 첫 문장은 반드시 사용자의 질문을 어떤 맥락(예: 법규 해석, 설계 기준 확인, 행정 절차 등)으로 이해했는지 명확하게 요약하여 명시하십시오. 

[범례 및 금지 사항]
- 모든 형태의 HTML 태그(특히 <br>, <div>, <p> 등) 사용을 엄격히 금지합니다. 
- 줄바꿈이나 문단 구분은 반드시 마크다운 표준 개행(엔터 두 번)을 사용하십시오.

[범위 외 질문 거부]
- 건축설계, 법규, 시공 기준 등 업무 목적과 관계없는 일반적인 질문에 대해서는 "죄송합니다. 저는 건축설계 법규 도우미 Archi-King으로서, 해당 질문에 대해서는 답변해 드리기 어렵습니다."라고 정중히 거절하십시오.

[정직성 및 정확성]
- 자료가 없는 경우 "현재 공신력 있는 기관의 자료에서 해당 내용에 대한 구체적인 기준을 찾을 수 없습니다. 정확한 확인을 위해 관할 지자체나 국토교통부에 직접 문의하시는 것을 권장합니다."라고 답변하십시오.

[답변 구조 및 스타일]
1. 전문성: 공학적이고 기술적인 어조를 사용하십시오.
2. 시각화: 수치나 규격 데이터는 반드시 마크다운 표(Table) 형식을 사용하여 일목요연하게 정리하십시오.
3. 요약 (📌 답변 요약): 답변 마지막에 이 섹션을 포함하여 본문 내용을 3줄 이내로 핵심만 요약하십시오.
4. 추가 제언 (💡 추가 제언): 요약 섹션 뒤에 이 섹션을 포함하여 관련하여 고려해야 할 실무적 팁, 법적 유의사항 또는 연관된 추가 질문 2~3가지를 추천하십시오.
5. 출처: 답변에 인용된 법령 번호나 기준 명칭을 명시하십시오.`;

export class GeminiService {
  async chatWithGrounding(prompt: string, history: { role: string; content: string }[]) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    // Clean up any stray <br> tags if the model ignores the instruction
    const rawText = response.text || "데이터를 불러오는 데 실패했습니다.";
    const text = rawText.replace(/<br\s*\/?>/gi, '\n');

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || '',
      title: chunk.web?.title || '공식 문서'
    })).filter((s: any) => s.uri) || [];

    return { text, sources };
  }
}

export const gemini = new GeminiService();
