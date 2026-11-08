// src/services/liveSocketService.ts

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
export type TrangThaiKetNoi = 'dangKetNoi' | 'sanSang' | 'matKetNoi';

const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_KEY}`;

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

class LiveSocketService {
  private ws: WebSocket | null = null;
  private isSetupComplete = false;
  private isConnecting = false;
  private onConnectionStateCallback: (status: TrangThaiKetNoi) => void = () => { };
  private onAudioDataCallback: (base64Audio: string) => void = () => { };
  private onTextCallback: (text: string) => void = () => { };
  private onFunctionCallCallback: (name: string, args: any) => void = () => { };

  connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.onConnectionStateCallback(this.isSetupComplete ? 'sanSang' : 'dangKetNoi');
        resolve();
        return;
      }

      this.isConnecting = true;
      this.onConnectionStateCallback('dangKetNoi');
      this.ws = new WebSocket(WS_URL);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('🔌 Đã kết nối WebSocket Live API');
        const setupMessage = {
          setup: {
            model: "models/gemini-3.8-live", 
            generationConfig: { 
              responseModalities: ["AUDIO"], 
            },
            outputAudioTranscription: {}, 
            systemInstruction: { 
              parts: [{ text: "Bạn là trợ lý ảo AI. Hãy trả lời ngắn gọn, thân thiện bằng tiếng Việt." }] 
            },
            tools: TOOLS
          }
        };
        this.ws?.send(JSON.stringify(setupMessage));
      };

      this.ws.onmessage = async (event) => {
        let rawData: string;
        if (event.data instanceof ArrayBuffer) {
          rawData = new TextDecoder('utf-8').decode(new Uint8Array(event.data));
        } else {
          rawData = event.data as string;
        }

        let message;
        try {
          message = JSON.parse(rawData);
        } catch (e) {
          return;
        }

        if (message.setupComplete) {
          console.log('✅ Thiết lập Live API hoàn tất');
          this.isSetupComplete = true;
          this.isConnecting = false;
          this.onConnectionStateCallback('sanSang');
          resolve();
          return;
        }

        if (message.error) {
          console.error('❌ Lỗi từ Live API Server:', message.error);
          this.isSetupComplete = false;
          this.isConnecting = false;
          this.onConnectionStateCallback('matKetNoi');
          reject(new Error('Live API connection failed'));
        }

        // Xử lý âm thanh và văn bản AI trả về
        if (message.serverContent?.modelTurn?.parts) {
          for (const part of message.serverContent.modelTurn.parts) {
            if (part.inlineData && part.inlineData.mimeType.includes('audio')) {
              this.onAudioDataCallback(part.inlineData.data);
            }
          }
        }
        
        // Xử lý bản ghi văn bản (transcription)
        if (message.serverContent?.outputTranscription?.text) {
           this.onTextCallback(message.serverContent.outputTranscription.text);
        }

        // Xử lý yêu cầu gọi hàm
        if (message.toolCall?.functionCalls) {
          for (const call of message.toolCall.functionCalls) {
            this.onFunctionCallCallback(call.name, call.args);
          }
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Lỗi WebSocket:', error);
        this.isConnecting = false;
        this.onConnectionStateCallback('matKetNoi');
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('🔌 Đã đóng kết nối WebSocket. Lý do:', event.reason);
        this.isSetupComplete = false;
        this.isConnecting = false;
        this.onConnectionStateCallback('matKetNoi');
        this.ws = null;
      };
    });
  }

  // GỬI TÍN HIỆU BẮT ĐẦU NÓI (VAD THỦ CÔNG)
  sendActivityStart() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return;
    const message = {
      realtimeInput: {
        activityStart: {}
      }
    };
    this.ws.send(JSON.stringify(message));
  }

  // GỬI TÍN HIỆU KẾT THÚC NÓI (VAD THỦ CÔNG)
  sendActivityEnd() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return;
    const message = {
      realtimeInput: {
        activityEnd: {}
      }
    };
    this.ws.send(JSON.stringify(message));
  }

  sendAudio(base64PCM: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return;
    const audioMessage = {
      realtimeInput: {
        mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64PCM }]
      }
    };
    this.ws.send(JSON.stringify(audioMessage));
  }

  async sendText(text: string) {
    // Tự động kết nối lại nếu mất kết nối
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) {
      console.log('🔄 Mất kết nối, đang tự động kết nối lại...');
      try {
        await this.connect();
      } catch (e) {
        console.error('Không thể kết nối lại:', e);
        return; 
      }
    }
    
    console.log('📤 Đang gửi văn bản:', text);
    const textMessage = {
      realtimeInput: {
        text: text
      }
    };
    this.ws?.send(JSON.stringify(textMessage));
  }

  sendFunctionResponse(functionName: string, result: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const responseMessage = {
      toolResponse: {
        functionResponses: [{ name: functionName, response: { result } }]
      }
    };
    this.ws.send(JSON.stringify(responseMessage));
  }

  onConnectionState(callback: (status: TrangThaiKetNoi) => void) {
    this.onConnectionStateCallback = callback;
    callback(this.isSetupComplete ? 'sanSang' : this.isConnecting ? 'dangKetNoi' : 'matKetNoi');
    return () => {
      if (this.onConnectionStateCallback === callback) {
        this.onConnectionStateCallback = () => { };
      }
    };
  }

  onAudioData(callback: (base64Audio: string) => void) { this.onAudioDataCallback = callback; }
  onText(callback: (text: string) => void) { this.onTextCallback = callback; }
  onFunctionCall(callback: (name: string, args: any) => void) { this.onFunctionCallCallback = callback; }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isSetupComplete = false;
      this.isConnecting = false;
      this.onConnectionStateCallback('matKetNoi');
      this.ws = null;
    }
  }
}

export const socketService = new LiveSocketService();