import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

// Query Keys Factory
export const botKeys = {
  all: ['bots'] as const,
  lists: () => [...botKeys.all, 'list'] as const,
  list: (filters?: string) => [...botKeys.lists(), { filters }] as const,
  details: () => [...botKeys.all, 'detail'] as const,
  detail: (id: string) => [...botKeys.details(), id] as const,
  status: (id: string) => [...botKeys.detail(id), 'status'] as const,
  logs: (id: string) => [...botKeys.detail(id), 'logs'] as const,
  chat: (id: string) => [...botKeys.detail(id), 'chat'] as const,
  chatHistory: (id: string, sessionId?: string) => [...botKeys.chat(id), sessionId || 'default'] as const,
};

// Get all bots
export const useBots = (filters?: { status?: string; search?: string }) => {
  return useQuery({
    queryKey: botKeys.list(JSON.stringify(filters || {})),
    queryFn: () => apiClient.getBots(),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
};

// Get single bot
export const useBot = (botId: string) => {
  return useQuery({
    queryKey: botKeys.detail(botId),
    queryFn: () => apiClient.getBot(botId),
    enabled: !!botId,
  });
};

// Bot status (real-time)
export const useBotStatus = (botId: string) => {
  return useQuery({
    queryKey: botKeys.status(botId),
    queryFn: () => apiClient.getBotStatus(botId),
    enabled: !!botId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

// Bot logs
export const useBotLogs = (botId: string) => {
  return useQuery({
    queryKey: botKeys.logs(botId),
    queryFn: () => apiClient.getBotLogs(botId),
    enabled: !!botId,
    refetchInterval: 5000, // Refetch every 5 seconds for live logs
  });
};

// Create bot mutation
export const useCreateBot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (botData: any) => apiClient.createBot(botData),
    onSuccess: (newBot) => {
      // Invalidate and refetch bots list
      queryClient.invalidateQueries({ queryKey: botKeys.lists() });
    },
    onError: (error: any) => {
      console.error('Failed to create bot:', error);
    },
  });
};

// Bot actions (start, stop, pause, resume)
export const useBotAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ botId, action }: { botId: string; action: 'start' | 'stop' | 'pause' | 'resume' }) => {
      switch (action) {
        case 'start':
          return apiClient.startBot(botId);
        case 'stop':
          return apiClient.stopBot(botId);
        case 'pause':
          return apiClient.pauseBot(botId);
        case 'resume':
          return apiClient.resumeBot(botId);
        default:
          throw new Error(`Invalid action: ${action}`);
      }
    },
    onSuccess: (_, { botId }) => {
      // Invalidate bot details and status
      queryClient.invalidateQueries({ queryKey: botKeys.detail(botId) });
      queryClient.invalidateQueries({ queryKey: botKeys.status(botId) });
      queryClient.invalidateQueries({ queryKey: botKeys.lists() });
    },
  });
};

// Update bot mutation
export const useUpdateBot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ botId, updates }: { botId: string; updates: any }) =>
      apiClient.updateBot(botId, updates),
    onSuccess: (_, { botId }) => {
      // Invalidate all bot-related queries
      queryClient.invalidateQueries({ queryKey: botKeys.detail(botId) });
      queryClient.invalidateQueries({ queryKey: botKeys.lists() });
    },
  });
};

// Delete bot mutation
export const useDeleteBot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (botId: string) => apiClient.deleteBot(botId),
    onSuccess: () => {
      // Invalidate bots list
      queryClient.invalidateQueries({ queryKey: botKeys.lists() });
    },
  });
};