'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/ChatInterface';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Bot, MessageSquare, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Bot {
  id: string;
  name: string;
  platforms: {
    discord?: { token: string };
    telegram?: { token: string };
    webChat?: { enabled: boolean; port: number };
  };
}

export default function BotChatPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [bot, setBot] = useState<Bot | null>(null);
  const [webChatEnabled, setWebChatEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBot();
  }, [params.id]);

  const loadBot = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/bots/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load bot');
      }

      const data = await response.json();
      setBot(data.bot);
      setWebChatEnabled(data.bot.platforms?.webChat?.enabled || false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load bot details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleWebChat = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/bots/${params.id}/platforms/webchat/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: !webChatEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle web chat');
      }

      const data = await response.json();
      setWebChatEnabled(!webChatEnabled);
      
      toast({
        title: 'Success',
        description: data.message,
      });

      // Reload bot to get updated configuration
      await loadBot();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle web chat',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>Bot not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/bots')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bots
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">{bot.name} - Chat Interface</h1>
        <p className="text-muted-foreground">
          Chat with your bot directly from the dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {webChatEnabled ? (
            <ChatInterface 
              botId={bot.id} 
              botName={bot.name}
              onSendMessage={(message) => {
                console.log('Message sent:', message);
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Web Chat Disabled</CardTitle>
                <CardDescription>
                  Enable web chat to start chatting with your bot
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Web chat is currently disabled for this bot
                  </p>
                  <Button onClick={toggleWebChat}>
                    Enable Web Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Chat Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="webchat-toggle" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Web Chat
                  </Label>
                  <Switch
                    id="webchat-toggle"
                    checked={webChatEnabled}
                    onCheckedChange={toggleWebChat}
                  />
                </div>
                
                {webChatEnabled && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Web chat is active and ready to receive messages
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bot.platforms?.discord && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Discord Connected</span>
                  </div>
                )}
                
                {bot.platforms?.telegram && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Telegram Connected</span>
                  </div>
                )}
                
                {webChatEnabled && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Web Chat Active</span>
                  </div>
                )}
                
                {!bot.platforms?.discord && !bot.platforms?.telegram && !webChatEnabled && (
                  <p className="text-sm text-muted-foreground">
                    No platforms connected
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Commands</CardTitle>
              <CardDescription>
                Try these commands in the chat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement;
                    if (input) {
                      input.value = 'Check my balance';
                      input.focus();
                    }
                  }}
                >
                  Check my balance
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement;
                    if (input) {
                      input.value = 'List my tokens';
                      input.focus();
                    }
                  }}
                >
                  List my tokens
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement;
                    if (input) {
                      input.value = 'Show DAO proposals';
                      input.focus();
                    }
                  }}
                >
                  Show DAO proposals
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}