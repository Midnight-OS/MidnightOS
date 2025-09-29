// API client for orchestrator
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface BotConfig {
  name: string;
  model: 'openai' | 'anthropic' | 'ollama';
  platform: 'discord' | 'telegram' | 'direct';
  config: Record<string, any>;
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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
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