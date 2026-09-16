import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class AgentActivityService extends EventEmitter {
  constructor() {
    super();
    // Default max listeners is 10, but we might have many SSE connections in development
    this.setMaxListeners(100);
  }

  /**
   * Log an agent event to the database and emit it via SSE.
   * 
   * @param {string|null} userId - The ID of the user (nullable for public/anonymous sessions)
   * @param {string} agent - The agent identifier (e.g. "NEXUS_DIRECTOR")
   * @param {string} eventType - The type of event (e.g. "JOB_SEARCH_STARTED")
   * @param {object} payload - Optional payload data to include
   */
  async logAgentEvent(userId, agent, eventType, payload = null) {
    try {
      const payloadString = payload ? JSON.stringify(payload) : null;
      
      const record = await prisma.agentEventLog.create({
        data: {
          userId: userId || null,
          agent,
          eventType,
          payload: payloadString
        }
      });

      // Emit for SSE clients
      this.emit('agent_activity', record);
      
      return record;
    } catch (error) {
      console.error('[AgentActivityService] Failed to log event:', error);
      // We don't throw here to avoid interrupting the main flow for telemetry failures
      return null;
    }
  }
}

// Singleton instance
const agentActivityService = new AgentActivityService();

export default agentActivityService;
