// src/services/liveSocketService.ts

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_KEY}`;

// Khai báo các Function Tools để AI biết nó có thể gọi hàm gì
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "tao_ghi_chu",
        description: "Tạo một ghi chú hoặc nhắc việc mới",
        parameters: {
          type: "OBJECT",
          properties: {
            tieuDe: { type: "STRING", description: "Tiêu đề công việc" },
            noiDung: { type: "STRING", description: "Nội dung chi tiết (có thể rỗng)" },
            thoiGianNhac: { type: "STRING", description: "Thời gian nhắc việc định dạng YYYY-MM-DDTHH:mm:00 (nếu có)" }
          },
          required: ["tieuDe", "noiDung"]
        }
      },
      {
        name: "xoa_ghi_chu",
        description: "Xóa một ghi chú dựa vào từ khóa",
        parameters: {
          type: "OBJECT",
          properties: { tuKhoaXoa: { type: "STRING", description: "Từ khóa của ghi chú cần xóa" } },
          required: ["tuKhoaXoa"]
        }
      },
      {
        name: "xem_ghi_chu",
        description: "Tìm kiếm hoặc xem một ghi chú",
        parameters: {
          type: "OBJECT",
          properties: { tuKhoaXem: { type: "STRING", description: "Từ khóa cần tìm" } },
          required: ["tuKhoaXem"]
        }
      }
    ]
  }
];

export class LiveSocketService {
  private ws: WebSocket | null = null;
  private isSetupComplete = false;
  private onAudioDataCallback: (base64Audio: string) => void = () => {};
  private onTextCallback: (text: string) => void = () => {};
  private onFunctionCallCallback: (name: string, args: any) => void = () => {};

  // Khởi tạo kết nối
  connect() {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('🔌 Đã kết nối WebSocket Live API');
        // Gửi gói tin Setup
        const setupMessage = {
          setup: {
            model: "models/gemini-3.8-live", // Hoặc gemini-2.0-flash-exp nếu lỗi
            generationConfig: { responseModalities: ["AUDIO", "TEXT"] },
            systemInstruction: { parts: [{ text: "Bạn là trợ lý ảo AI. Hãy trả lời ngắn gọn, thân thiện bằng tiếng Việt." }] },
            tools: TOOLS
          }
        };
        this.ws?.send(JSON.stringify(setupMessage));
      };

      this.ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        if (message.setupComplete) {
          console.log('✅ Thiết lập Live API hoàn tất');
          this.isSetupComplete = true;
          resolve();
          return;
        }

        // Nhận âm thanh từ AI
        if (message.serverContent?.modelTurn?.parts) {
          for (const part of message.serverContent.modelTurn.parts) {
            if (part.inlineData && part.inlineData.mimeType.includes('audio')) {
              this.onAudioDataCallback(part.inlineData.data);
            }
            if (part.text) {
              this.onTextCallback(part.text);
            }
          }
        }

        // Nhận yêu cầu gọi hàm (Function Call)
        if (message.toolCall?.functionCalls) {
          for (const call of message.toolCall.functionCalls) {
            console.log('🛠️ AI yêu cầu gọi hàm:', call.name, call.args);
            this.onFunctionCallCallback(call.name, call.args);
          }
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Lỗi WebSocket:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('🔌 Đã đóng kết nối WebSocket');
        this.isSetupComplete = false;
      };
    });
  }

  // Gửi âm thanh (PCM 16kHz Base64)
  sendAudio(base64PCM: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return;
    
    const audioMessage = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: "audio/pcm;rate=16000",
          data: base64PCM
        }]
      }
    };
    this.ws.send(JSON.stringify(audioMessage));
  }

  // Gửi văn bản (Text) từ bàn phím
  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return;
    
    const textMessage = {
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true
      }
    };
    this.ws.send(JSON.stringify(textMessage));
  }

  // Gửi kết quả sau khi App thực thi Function Call xong
  sendFunctionResponse(functionName: string, result: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const responseMessage = {
      toolResponse: {
        functionResponses: [{
          name: functionName,
          response: { result }
        }]
      }
    };
    this.ws.send(JSON.stringify(responseMessage));
  }

  // Đăng ký các sự kiện
  onAudioData(callback: (base64Audio: string) => void) { this.onAudioDataCallback = callback; }
  onText(callback: (text: string) => void) { this.onTextCallback = callback; }
  onFunctionCall(callback: (name: string, args: any) => void) { this.onFunctionCallCallback = callback; }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}