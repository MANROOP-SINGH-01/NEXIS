export interface AgentWorkspaceData {
  agentIndex: number;
  role: string;
  itemType: 'paper' | 'folder' | 'card' | 'book';
  count: number;
  stageName: string;
  items: Array<{
    id: string;
    title: string;
    timestamp: number;
  }>;
}

export class AgentWorkspaceMemory {
  private memories: Map<number, AgentWorkspaceData> = new Map();

  constructor() {
    this.initDefaultMemories();
  }

  private initDefaultMemories() {
    const roles: Record<number, { role: string; itemType: 'paper' | 'folder' | 'card' | 'book'; stageName: string }> = {
      1: { role: 'Director', itemType: 'folder', stageName: 'Architecture Directives' },
      2: { role: 'Vision', itemType: 'paper', stageName: 'ATS Visual Audits' },
      3: { role: 'Strategist', itemType: 'paper', stageName: 'Skill Gap Analyses' },
      4: { role: 'Writer', itemType: 'paper', stageName: 'STAR Bullet Drafts' },
      5: { role: 'Hunter', itemType: 'card', stageName: 'Targeted Job Cards' },
      6: { role: 'Mirror', itemType: 'book', stageName: 'Interview Scorecards' },
    };

    for (let i = 1; i <= 6; i++) {
      const config = roles[i] || { role: `Node ${i}`, itemType: 'paper', stageName: 'Telemetry Dossiers' };
      this.memories.set(i, {
        agentIndex: i,
        role: config.role,
        itemType: config.itemType,
        count: 0,
        stageName: config.stageName,
        items: [],
      });
    }
  }

  public recordProgress(agentIndex: number, title: string, customStage?: string): void {
    const memory = this.memories.get(agentIndex);
    if (!memory) return;

    memory.count += 1;
    if (customStage) {
      memory.stageName = customStage;
    }
    memory.items.unshift({
      id: `${agentIndex}-${Date.now()}-${memory.count}`,
      title,
      timestamp: Date.now(),
    });

    // Keep max 20 historical items in memory ledger
    if (memory.items.length > 20) {
      memory.items = memory.items.slice(0, 20);
    }
  }

  public getMemory(agentIndex: number): AgentWorkspaceData | undefined {
    return this.memories.get(agentIndex);
  }

  public getAllMemories(): AgentWorkspaceData[] {
    return Array.from(this.memories.values());
  }

  public reset(): void {
    this.memories.clear();
    this.initDefaultMemories();
  }
}
