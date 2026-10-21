const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;

export interface KetQuaTrichXuat {
  tieuDe: string;
  noiDung: string;
  thoiGianNhac: string | null;
}

export const phanTichCauLenh = async (cauLenh: string): Promise<KetQuaTrichXuat | null> => {
  try {
    const homNay = new Date().toISOString();

    const prompt = `
      Bạn là một trợ lý ảo. Hôm nay là ngày ${homNay}.
      Hãy trích xuất thông tin từ câu nói của người dùng thành định dạng JSON với 3 trường:
      - "tieuDe": Tên công việc (ngắn gọn).
      - "noiDung": Nội dung chi tiết (nếu có, nếu không có thì để chuỗi rỗng "").
      - "thoiGianNhac": Thời gian nhắc việc (định dạng chuẩn ISO 8601). Nếu không có thời gian, trả về null.
      
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