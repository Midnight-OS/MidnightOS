import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { botKeys } from './useBots';

// Chat history
export const useChatHistory = (botId: string, sessionId?: string) => {
  return useQuery({
    queryKey: botKeys.chatHistory(botId, sessionId),
    queryFn: () => apiClient.getChatHistory(botId, sessionId),
    enabled: !!botId,
    staleTime: 0, // Always consider chat history stale
    refetchInterval: false, // Don't auto-refetch, we'll use WebSocket for real-time
  });
};

// Send message with optimistic updates
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ botId, message, sessionId }: { botId: string; message: string; sessionId?: string }) =>
      apiClient.sendMessage(botId, message, sessionId),
    
    onMutate: async ({ botId, message, sessionId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: botKeys.chatHistory(botId, sessionId) });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(botKeys.chatHistory(botId, sessionId));

      // Optimistically update
      const optimisticMessage = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: message,
        timestamp: new Date(),
        status: 'sending' as const,
      };

      queryClient.setQueryData(botKeys.chatHistory(botId, sessionId), (old: any) => ({
        ...old,
        messages: [...(old?.messages || []), optimisticMessage],
      }));

      return { previousMessages };
    },

    onSuccess: (data, { botId, sessionId }) => {
      // Invalidate to get the real response from server
      queryClient.invalidateQueries({ queryKey: botKeys.chatHistory(botId, sessionId) });
    },

    onError: (error, { botId, sessionId }, context) => {
      // Revert optimistic update on error
      if (context?.previousMessages) {
        queryClient.setQueryData(botKeys.chatHistory(botId, sessionId), context.previousMessages);
      }
    },
  });
};