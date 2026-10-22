// src/services/geminiService.ts

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Danh sách model ưu tiên: Thử model chính trước, nếu lỗi sẽ thử model dự phòng
const MODEL_URLS = [
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${API_KEY}`,
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`
];

export interface KetQuaAI {
  action: 'tao_moi' | 'xoa' | 'tro_chuyen' | 'hoi_lai';
  reply: string;
  ghiChu?: {
    tieuDe: string;
    noiDung: string;
    thoiGianNhac: string | null;
  } | null;
  tuKhoaXoa?: string | null;
}

// Hàm tiện ích: Tạo độ trễ (delay)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const phanTichCauLenh = async (
  cauLenh: string, 
  lichSuChat: { vaiTro: string, noiDung: string }[] = []
): Promise<KetQuaAI | null> => {
  const now = new Date();
  const homNay = now.toISOString();
  const thuTrongTuan = now.getDay(); 
  
  const historyParts = lichSuChat.map(msg => ({
    role: msg.vaiTro === 'nguoiDung' ? 'user' : 'model',
    parts: [{ text: msg.noiDung }]
  }));

  const prompt = `Câu nói hiện tại của người dùng: "${cauLenh}"`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: `
        Bạn là một trợ lý ảo tên là "Trợ lý AI". 
        Thời gian hiện tại: ${homNay} (Hôm nay là thứ ${thuTrongTuan}).
        
        Nhiệm vụ của bạn là phân tích câu nói của người dùng và trả về ĐÚNG định dạng JSON với cấu trúc:
        {
          "action": "tao_moi" | "xoa" | "tro_chuyen" | "hoi_lai",
          "reply": "Câu trả lời của bạn",
          "ghiChu": { "tieuDe": "...", "noiDung": "...", "thoiGianNhac": "..." } | null,
          "tuKhoaXoa": "Từ khóa để tìm ghi chú cần xóa" | null
        }

        QUY TẮC BẮT BUỘC:
        1. "action" = "tao_moi": Khi muốn nhắc việc. "thoiGianNhac" phải chuẩn ISO 8601. Nếu thiếu thời gian, để null. "reply" trả về "Đã tạo ghi chú".
        2. "action" = "hoi_lai": Khi muốn tạo ghi chú nhưng THIẾU thời gian. Hỏi lại trong "reply".
        3. "action" = "xoa": Khi muốn hủy/xóa ghi chú. Trích xuất từ khóa chính vào "tuKhoaXoa". "reply" trả về "Đang tiến hành xóa".
        4. "action" = "tro_chuyen": Khi chào hỏi, cảm ơn. Trả lời thân thiện vào "reply".
      ` }]
    },
    contents: [
      ...historyParts,
      { role: "user", parts: [{ text: prompt }] }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      thinkingConfig: {
        thinkingLevel: "low"
      }
    }
  };

  // Thử với từng Model (Ưu tiên model đầu tiên trong mảng)
  for (const url of MODEL_URLS) {
    let delay = 1000; // Bắt đầu với 1 giây

    // Thử lại tối đa 3 lần cho mỗi model
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        // Nếu thành công, xử lý dữ liệu và trả về ngay
        if (response.ok) {
          const data = await response.json();
          const chuoiKetQua = data.candidates[0].content.parts[0].text;
          const chuoiJsonSach = chuoiKetQua.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(chuoiJsonSach) as KetQuaAI;
        }

        // Nếu lỗi 503 (Quá tải), thực hiện chờ và thử lại
        if (response.status === 503) {
          console.log(`[Thử lần ${attempt}/3] Model quá tải (503). Đợi ${delay / 1000}s...`);
          await sleep(delay);
          delay *= 2; // Tăng thời gian chờ gấp đôi cho lần thử tiếp theo
        } else {
          // Các lỗi khác (400, 404...) thì không thử lại
          const errorData = await response.json();
          console.log('Lỗi không thể phục hồi từ Gemini:', errorData);
          break; // Thoát vòng lặp thử lại của model hiện tại, chuyển sang model dự phòng
        }
      } catch (error) {
        console.log(`Lỗi mạng khi gọi Gemini (Lần ${attempt}):`, error);
        await sleep(delay);
        delay *= 2;
      }
    }
    console.log('Model hiện tại thất bại, chuyển sang model dự phòng...');
  }

  // Nếu tất cả các model và các lần thử đều thất bại
  return null;
};