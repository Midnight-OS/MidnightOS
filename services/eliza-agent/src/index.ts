import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import { character } from './character.ts';
import { logConfiguration } from './config.ts';
import midnightPlugin from './plugin.ts';

const initCharacter = ({ runtime }: { runtime: IAgentRuntime }) => {
  logger.info('Initializing MidnightOS character');
  logger.info('Name: ', character.name);
  logger.info('Plugins: ', character.plugins?.join(', ') || 'None');
  
  // Log configuration for debugging
  logConfiguration();
};

export const projectAgent: ProjectAgent = {
  character,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
  plugins: [midnightPlugin], // Register custom plugin here
};

const project: Project = {
  agents: [projectAgent],
};

// Export character for external use
export { character } from './character.ts';

export default project;