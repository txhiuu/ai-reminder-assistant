import * as FileSystem from 'expo-file-system/legacy';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_KEY}`;
const GROQ_URL = `https://api.groq.com/openai/v1/chat/completions`;
const GROQ_MODELS_URL = `https://api.groq.com/openai/v1/models`;

export interface HanhDong {
  action: 'tao_moi' | 'xoa' | 'tro_chuyen' | 'hoi_lai' | 'xem_ghi_chu' | 'sua_ghi_chu'; 
  reply: string;
  ghiChu?: {
    tieuDe: string | null;
    noiDung: string | null;
    thoiGianNhac: string | null;
  } | null;
  tuKhoaXoa?: string | null;
  tuKhoaXem?: string | null; 
  tuKhoaSua?: string | null;
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

const getSystemPrompt = () => {
  const now = new Date();
  const homNay = now.toISOString();
  const thuTrongTuanMap = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const tenThuHienTai = thuTrongTuanMap[now.getDay()];
  const ngayThangNam = now.toLocaleDateString('vi-VN');

  return `
    Bạn là Trợ lý ảo AI. 
    SỰ THẬT TUYỆT ĐỐI: Hôm nay là ${tenThuHienTai}, ngày ${ngayThangNam} (Giờ ISO: ${homNay}).
    
    QUY TẮC THỜI GIAN:
    - Múi giờ của người dùng là Việt Nam (UTC+7).
    - Khi trả về trường "thoiGianNhac", BẮT BUỘC phải trả về định dạng "YYYY-MM-DDTHH:mm:00" (TUYỆT ĐỐI KHÔNG có chữ Z ở cuối).
    - Ví dụ: Nếu hôm nay là 25/10/2026, người dùng nói "3h chiều mai", bạn phải trả về chính xác là "2026-10-26T15:00:00".
    
    QUY TẮC PHÂN LOẠI HÀNH ĐỘNG:
    1. HÀNH ĐỘNG "tao_moi": Tạo lịch, nhắc việc (thường bắt đầu bằng: "Nhắc tôi...", "Lên lịch...", "Tạo ghi chú..."). PHẢI trích xuất thông tin vào "ghiChu".
    2. HÀNH ĐỘNG "xem_ghi_chu": Tìm kiếm, xem, mở ghi chú ("Cho tôi xem...", "Tìm ghi chú..."). PHẢI trích xuất từ khóa vào "tuKhoaXem".
    3. HÀNH ĐỘNG "xoa": Xóa ghi chú ("Xóa...", "Hủy..."). PHẢI trích xuất từ khóa vào "tuKhoaXoa".
    4. HÀNH ĐỘNG "sua_ghi_chu": Sửa ghi chú ("Đổi lịch...", "Sửa..."). BẮT BUỘC trích xuất từ khóa cũ vào "tuKhoaSua" và thông tin mới vào "ghiChu" (trường không đổi trả về null).
    5. HÀNH ĐỘNG "tro_chuyen" hoặc "hoi_lai": Các trường hợp còn lại.

    Nhiệm vụ: Phân tích câu nói và trả về ĐÚNG MỘT object JSON:
    {"actions": [{"action": "tao_moi"|"xoa"|"tro_chuyen"|"hoi_lai"|"xem_ghi_chu"|"sua_ghi_chu", "reply": "câu trả lời của bạn", "ghiChu": {"tieuDe", "noiDung", "thoiGianNhac"} | null, "tuKhoaXoa": "..." | null, "tuKhoaXem": "..." | null, "tuKhoaSua": "..." | null}]}
    
    VÍ DỤ MINH HỌA (BẮT BUỘC TUÂN THEO):
    - User: "nhắc tôi ăn sáng với bánh mì vào 8h sáng mai" 
      -> {"actions": [{"action": "tao_moi", "reply": "Đã tạo lịch ăn sáng", "ghiChu": {"tieuDe": "Ăn sáng", "noiDung": "với bánh mì", "thoiGianNhac": "2026-10-26T08:00:00"}, "tuKhoaXoa": null, "tuKhoaXem": null, "tuKhoaSua": null}]}
    - User: "Cho tôi xem ghi chú ăn sáng" 
      -> {"actions": [{"action": "xem_ghi_chu", "reply": "Đang mở ghi chú ăn sáng", "ghiChu": null, "tuKhoaXoa": null, "tuKhoaXem": "ăn sáng", "tuKhoaSua": null}]}
    - User: "Xóa ghi chú ăn sáng" 
      -> {"actions": [{"action": "xoa", "reply": "Đã xóa", "ghiChu": null, "tuKhoaXoa": "ăn sáng", "tuKhoaXem": null, "tuKhoaSua": null}]}
    - User: "Đổi lịch họp thành 4h chiều mai" 
      -> {"actions": [{"action": "sua_ghi_chu", "reply": "Đã cập nhật giờ họp", "ghiChu": {"tieuDe": null, "noiDung": null, "thoiGianNhac": "2026-10-26T16:00:00"}, "tuKhoaXoa": null, "tuKhoaXem": null, "tuKhoaSua": "họp"}]}
    - User: "Sửa ghi chú mua sữa thành mua bánh mì" 
      -> {"actions": [{"action": "sua_ghi_chu", "reply": "Đã đổi tên ghi chú", "ghiChu": {"tieuDe": "mua bánh mì", "noiDung": null, "thoiGianNhac": null}, "tuKhoaXoa": null, "tuKhoaXem": null, "tuKhoaSua": "mua sữa"}]}
    
    LƯU Ý: BẮT BUỘC chỉ trả về JSON.
  `;
};

export const phanTichCauLenh = async (
  cauLenh: string, 
  lichSuChat: { vaiTro: string, noiDung: string }[] = []
): Promise<HanhDong[] | null> => {
  const systemPrompt = getSystemPrompt(); 

  // GỌI GEMINI
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

  // GỌI GROQ
  try {
    console.log('🔄 Đang lấy danh sách model khả dụng từ Groq...');
    const modelsRes = await fetch(GROQ_MODELS_URL, {
      headers: { 'Authorization': `Bearer ${GROQ_KEY}` },
    });

    if (!modelsRes.ok) return null;

    const modelsData = await modelsRes.json();
    const activeChatModels = modelsData.data
      .map((m: any) => m.id)
      .filter((id: string) => !id.includes('whisper') && !id.includes('tts') && !id.includes('guard') && !id.includes('safeguard'));

    if (activeChatModels.length === 0) return null;

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

// HÀM XỬ LÝ ÂM THANH
export const phanTichAmThanh = async (fileUri: string): Promise<HanhDong[] | null> => {
  try {
    console.log('⏳ Đang đọc file âm thanh...');
    const base64Audio = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const systemPrompt = getSystemPrompt(); 

    console.log('🎙️ Đang gửi âm thanh lên Gemini...');
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: "Hãy nghe và phân tích file âm thanh này." },
              {
                inlineData: {
                  mimeType: "audio/m4a",
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      }),
    });

    if (geminiRes.ok) {
      const data = await geminiRes.json();
      const chuoiJson = data.candidates[0].content.parts[0].text;
      const parsed = safeParseJSON(chuoiJson);
      
      if (parsed && parsed.actions) {
        console.log('🎙️ [AI Provider] Trả lời bởi: Gemini (Voice)');
        return parsed.actions as HanhDong[];
      }
    } else {
      const loi = await geminiRes.json();
      console.log('⚠️ Lỗi Gemini xử lý âm thanh:', JSON.stringify(loi));
    }
  } catch (loi) {
    console.log('❌ Lỗi khi xử lý âm thanh:', loi);
  }
  return null;
};