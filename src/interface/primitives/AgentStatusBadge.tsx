import React from 'react';
import { Badge } from './Badge';
import { Activity, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export type AgentOperationalState = 'idle' | 'thinking' | 'working' | 'completed' | 'error' | 'active' | 'success';

export interface AgentStatusBadgeProps {
  status: AgentOperationalState | string;
  size?: 'sm' | 'md';
}

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const normalizedStatus = (status || 'idle').toLowerCase() as AgentOperationalState;

  switch (normalizedStatus) {
    case 'working':
    case 'active':
      return (
        <Badge variant="indigo" size={size} pulseDot className="gap-1.5 font-mono">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>EXECUTING</span>
        </Badge>
      );
    case 'thinking':
      return (
        <Badge variant="purple" size={size} pulseDot className="gap-1.5 font-mono">
          <Clock className="w-3 h-3 animate-spin" />
          <span>SYNTHESIZING</span>
        </Badge>
      );
    case 'completed':
    case 'success':
      return (
        <Badge variant="mint" size={size} className="gap-1.5 font-mono">
          <CheckCircle2 className="w-3 h-3" />
          <span>SYNCED</span>
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="coral" size={size} className="gap-1.5 font-mono">
          <AlertCircle className="w-3 h-3" />
          <span>INTERRUPTED</span>
        </Badge>
      );
    case 'idle':
    default:
      return (
        <Badge variant="neutral" size={size} className="gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          <span>STANDBY</span>
        </Badge>
      );
  }
};
