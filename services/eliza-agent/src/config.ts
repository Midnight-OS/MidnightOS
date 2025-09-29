/**
 * Configuration helper for Eliza Agent
 * Handles both local development and Orchestrator deployment scenarios
 */

export function isValidToken(token: string | undefined): boolean {
  if (!token || token.trim() === '') {
    return false;
  }
  
  // Check if it's a placeholder token (used by Orchestrator)
  if (token.includes('{{') && token.includes('}}')) {
    return false;
  }
  
  // Check if it's a template variable
  if (token === 'your-actual-discord-token-here' ||
      token === 'your-actual-telegram-bot-token-here' ||
      token === 'your-actual-openai-key-here') {
    return false;
  }
  
  return true;
}

export function getValidEnvVar(key: string): string | undefined {
  const value = process.env[key];
  return isValidToken(value) ? value : undefined;
}

export function logConfiguration() {
  console.log('=== Eliza Agent Configuration ===');
  console.log('Agent ID:', process.env.AGENT_ID || 'Not set');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('MCP URL:', process.env.WALLET_MCP_URL || 'Not set');
  
  // Check platform integrations
  const platforms = [];
  if (isValidToken(process.env.DISCORD_TOKEN)) {
    platforms.push('Discord');
  }
  if (isValidToken(process.env.TELEGRAM_BOT_TOKEN)) {
    platforms.push('Telegram');
  }
  if (isValidToken(process.env.TWITTER_API_KEY)) {
    platforms.push('Twitter');
  }
  
  console.log('Active Platforms:', platforms.length > 0 ? platforms.join(', ') : 'None (local mode)');
  
  // Check AI models
  const models = [];
  if (isValidToken(process.env.OPENAI_API_KEY)) {
    models.push('OpenAI');
  }
  if (isValidToken(process.env.ANTHROPIC_API_KEY)) {
    models.push('Anthropic');
  }
  
  console.log('Available Models:', models.length > 0 ? models.join(', ') : 'None configured');
  console.log('================================');
}