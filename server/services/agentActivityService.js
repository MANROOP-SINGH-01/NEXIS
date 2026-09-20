import { EventEmitter } from 'events';
import prisma from '../lib/prisma.js';

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
      let record = null;

      try {
        record = await prisma.agentEventLog.create({
          data: {
            userId: userId || null,
            agent,
            eventType,
            payload: payloadString,
          },
        });
      } catch (dbErr) {
        // Fallback for synthetic cohort IDs or non-user actors to ensure SSE telemetry flows
        record = {
          id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: userId || null,
          agent,
          eventType,
          payload: payloadString,
          createdAt: new Date().toISOString(),
        };
      }

      // Emit for SSE clients
      if (record) {
        this.emit('agent_activity', record);
      }
      
      return record;
    } catch (error) {
      return null;
    }
  }
}

// Singleton instance
const agentActivityService = new AgentActivityService();

export default agentActivityService;
