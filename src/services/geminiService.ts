const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
const GROQ_URL = `https://api.groq.com/openai/v1/chat/completions`;
const GROQ_MODELS_URL = `https://api.groq.com/openai/v1/models`; // Endpoint lấy danh sách model

export interface HanhDong {
  action: 'tao_moi' | 'xoa' | 'tro_chuyen' | 'hoi_lai';
  reply: string;
  ghiChu?: {
    tieuDe: string;
    noiDung: string;
    thoiGianNhac: string | null;
  } | null;
  tuKhoaXoa?: string | null;
}

const safeParseJSON = (text: string) => {
  try {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      const jsonString = text.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonString);
    }
    return JSON.parse(text);
  } catch (e) {
    console.log('❌ Lỗi Parse JSON. Chuỗi gốc:', text);
    return null;
  }
};

export const phanTichCauLenh = async (
  cauLenh: string, 
  lichSuChat: { vaiTro: string, noiDung: string }[] = []
): Promise<HanhDong[] | null> => {
  const now = new Date();
  const homNay = now.toISOString();
  const thuTrongTuan = now.getDay(); 

  const systemPrompt = `
    Bạn là Trợ lý ảo AI. Hôm nay: ${homNay} (Thứ ${thuTrongTuan}).
    Nhiệm vụ: Phân tích câu nói của người dùng và trả về ĐÚNG MỘT object JSON có cấu trúc sau:
    {"actions": [{"action": "tao_moi"|"xoa"|"tro_chuyen"|"hoi_lai", "reply": "câu trả lời", "ghiChu": {"tieuDe", "noiDung", "thoiGianNhac"} | null, "tuKhoaXoa": "..." | null}]}
    
    VÍ DỤ:
    - "Chào" -> {"actions": [{"action": "tro_chuyen", "reply": "Chào bạn!", "ghiChu": null, "tuKhoaXoa": null}]}
    - "Họp 3h chiều mai" -> {"actions": [{"action": "tao_moi", "reply": "Đã tạo", "ghiChu": {"tieuDe": "Họp", "noiDung": "", "thoiGianNhac": "2026-10-24T15:00:00Z"}, "tuKhoaXoa": null}]}
    - "Xóa họp, nhắc đá bóng 5h chiều" -> {"actions": [{"action": "xoa", "reply": "Đã xóa", "ghiChu": null, "tuKhoaXoa": "họp"}, {"action": "tao_moi", "reply": "Đã tạo", "ghiChu": {"tieuDe": "đá bóng", "noiDung": "", "thoiGianNhac": "2026-10-23T17:00:00Z"}, "tuKhoaXoa": null}]}
    
    LƯU Ý: BẮT BUỘC chỉ trả về JSON, không sinh ra văn bản bên ngoài.
  `;

  // ==========================================
  // CHIẾN THUẬT 1: GỌI GEMINI (Timeout 4.5s)
  // ==========================================
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const historyParts = lichSuChat.map(msg => ({
      role: msg.vaiTro === 'nguoiDung' ? 'user' : 'model',
      parts: [{ text: msg.noiDung }]
    }));

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [...historyParts, { role: "user", parts: [{ text: cauLenh }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 400,
        }
      }),
    });
    clearTimeout(timeoutId);

    if (geminiRes.ok) {
      const data = await geminiRes.json();
      const chuoiJson = data.candidates[0].content.parts[0].text;
      const parsed = safeParseJSON(chuoiJson);
      
      if (parsed && parsed.actions) {
        console.log('🤖 [AI Provider] Trả lời bởi: Gemini');
        return parsed.actions as HanhDong[];
      }
    } else {
      console.log('⚠️ Gemini báo lỗi, chuyển sang Groq...');
    }
  } catch (loi) {
    console.log('⚠️ Gemini quá thời gian, chuyển sang Groq...');
  }

  // ==========================================
  // CHIẾN THUẬT 2: GỌI GROQ (Tự động lấy danh sách model)
  // ==========================================
  try {
    console.log('🔄 Đang lấy danh sách model khả dụng từ Groq...');
    const modelsRes = await fetch(GROQ_MODELS_URL, {
      headers: { 'Authorization': `Bearer ${GROQ_KEY}` },
    });

    if (!modelsRes.ok) {
      console.log('❌ Không thể lấy danh sách model từ Groq.');
      return null;
    }

    const modelsData = await modelsRes.json();

    const activeChatModels = modelsData.data
      .map((m: any) => m.id)
      .filter((id: string) => !id.includes('whisper') && !id.includes('tts') && !id.includes('guard') && !id.includes('safeguard'));

    if (activeChatModels.length === 0) {
      console.log('❌ Groq không có model chat nào khả dụng.');
      return null;
    }

    console.log('✅ Các model Groq khả dụng:', activeChatModels);

    const groqHistory = lichSuChat.map(msg => ({
      role: msg.vaiTro === 'nguoiDung' ? 'user' : 'assistant',
      content: msg.noiDung
    }));

    for (const modelName of activeChatModels) {
      try {
        console.log(`⏳ Đang thử Groq với model: ${modelName}...`);
        
        const groqRes = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`
          },
          body: JSON.stringify({
            model: modelName, 
            messages: [
              { role: "system", content: systemPrompt },
              ...groqHistory,
              { role: "user", content: cauLenh }
            ],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: "json_object" }
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const chuoiJson = data.choices[0].message.content;
          const parsed = safeParseJSON(chuoiJson);
          
          if (parsed && parsed.actions) {
            console.log(`🚀 [AI Provider] Trả lời bởi: Groq (${modelName})`);
            return parsed.actions as HanhDong[];
          }
        } else {
          const loiGroq = await groqRes.json();
          console.log(`❌ Model ${modelName} lỗi:`, JSON.stringify(loiGroq));
        }
      } catch (loi) {
        console.log(`❌ Lỗi mạng khi gọi model ${modelName}:`, loi);
      }
    }
  } catch (loi) {
    console.log('❌ Lỗi khi xử lý danh sách model Groq:', loi);
  }

  console.log('❌ Toàn bộ hệ thống AI đều thất bại.');
  return null;
};