const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;

export interface KetQuaTrichXuat {
  isTask: boolean;
  reply: string;
  tieuDe: string | null;
  noiDung: string | null;
  thoiGianNhac: string | null;
}

export const phanTichCauLenh = async (cauLenh: string): Promise<KetQuaTrichXuat | null> => {
  try {
    const homNay = new Date().toISOString();

    const prompt = `
      Bạn là một trợ lý ảo thông minh. Hôm nay là ngày ${homNay}.
      Nhiệm vụ của bạn là phân tích câu nói của người dùng và trả về ĐÚNG định dạng JSON với 5 trường sau:
      - "isTask": (boolean) Trả về true nếu người dùng muốn tạo một lời nhắc/ghi chú. Trả về false nếu người dùng chỉ chào hỏi, cảm ơn hoặc trò chuyện phiếm.
      - "reply": (string) Nếu isTask = false, hãy trả lời người dùng một cách thân thiện. Nếu isTask = true, để chuỗi rỗng "".
      - "tieuDe": (string | null) Tên công việc ngắn gọn (chỉ lấy khi isTask = true).
      - "noiDung": (string | null) Nội dung chi tiết (chỉ lấy khi isTask = true).
      - "thoiGianNhac": (string | null) Định dạng ISO 8601. Nếu không có thời gian, trả về null.
      
      Câu nói của người dùng: "${cauLenh}"
    `;

    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('Lỗi từ Gemini API:', data);
      return null;
    }

    const chuoiKetQua = data.candidates[0].content.parts[0].text;

    const ketQua: KetQuaTrichXuat = JSON.parse(chuoiKetQua);
    return ketQua;

  } catch (loi) {
    console.log('Lỗi khi gọi Gemini:', loi);
    return null;
  }
};