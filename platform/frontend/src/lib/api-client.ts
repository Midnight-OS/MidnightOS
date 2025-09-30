// API client for orchestrator
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
console.log('🔧 API_BASE_URL configured as:', API_BASE_URL);

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface BotConfig {
  name: string;
  features: {
    wallet: boolean;
    dao: boolean;
    marketplace: boolean;
  };
  platforms: {
    discord?: { token: string };
    telegram?: { token: string };
    webChat?: { enabled: boolean };
  };
  tier?: 'basic' | 'premium' | 'enterprise';
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Check for token in localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log('🔗 API Request:', { API_BASE_URL, endpoint, fullUrl });

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        timeout: 30000, // 30 second timeout
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }

        console.error('❌ API Error:', { status: response.status, message: errorMessage, endpoint });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ API Success:', { endpoint, data });
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 Network Error:', { endpoint, error: error.message });
        throw new Error('Network error: Please check your connection');
      }
      console.error('❌ API Request Failed:', { endpoint, error });
      throw error;
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Auth endpoints - Fixed to match orchestrator API
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Bot management
  async getBots() {
    return this.request<{ bots: any[] }>('/bots');
  }

  async createBot(bot: BotConfig) {
    return this.request('/bots', {
      method: 'POST',
      body: JSON.stringify(bot),
    });
  }

  async getBot(id: string) {
    return this.request(`/bots/${id}`);
  }

  async updateBot(id: string, updates: Partial<BotConfig>) {
    return this.request(`/bots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteBot(id: string) {
    return this.request(`/bots/${id}`, {
      method: 'DELETE',
    });
  }

  async startBot(id: string) {
    return this.request(`/bots/${id}/start`, {
      method: 'POST',
    });
  }

  async stopBot(id: string) {
    return this.request(`/bots/${id}/stop`, {
      method: 'POST',
    });
  }

  async pauseBot(id: string) {
    return this.request(`/bots/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeBot(id: string) {
    return this.request(`/bots/${id}/resume`, {
      method: 'POST',
    });
  }

  async getBotStatus(id: string) {
    return this.request(`/bots/${id}/status`);
  }

  async getBotLogs(id: string) {
    return this.request(`/bots/${id}/logs`);
  }

  async getBotDeploymentStatus(id: string) {
    return this.request(`/bots/${id}/deployment-status`);
  }

  async toggleBotWebChat(id: string, enabled: boolean) {
    return this.request(`/bots/${id}/platforms/webchat/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  // Chat
  async sendMessage(botId: string, message: string, sessionId?: string) {
    return this.request(`/bots/${botId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    });
  }

  async getChatHistory(botId: string, sessionId?: string) {
    const params = sessionId ? `?sessionId=${sessionId}` : '';
    return this.request(`/bots/${botId}/chat/history${params}`);
  }

  // WebSocket for real-time updates
  connectWebSocket(onMessage: (data: any) => void) {
    const ws = new WebSocket('ws://localhost:3002/ws');
    
    ws.onopen = () => {
      if (this.token) {
        ws.send(JSON.stringify({ type: 'auth', token: this.token }));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    return ws;
  }
}

export const apiClient = new ApiClient();
export default apiClient;