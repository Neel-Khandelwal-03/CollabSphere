import {
  Bug, Sparkles, TrendingUp, CheckSquare, Search, Layers,
  FileText, Gauge, Shield, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CONFIG = {
  bug: { label: 'Bug', icon: Bug, color: '#D64545' },
  feature_request: { label: 'Feature', icon: Sparkles, color: '#6E56CF' },
  improvement: { label: 'Improvement', icon: TrendingUp, color: '#1B8A5A' },
  task: { label: 'Task', icon: CheckSquare, color: '#5B6B85' },
  research: { label: 'Research', icon: Search, color: '#2E7DBF' },
  epic: { label: 'Epic', icon: Layers, color: '#B34AA3' },
  documentation: { label: 'Docs', icon: FileText, color: '#5B6B85' },
  performance: { label: 'Performance', icon: Gauge, color: '#B7791F' },
  security: { label: 'Security', icon: Shield, color: '#D64545' },
  technical_debt: { label: 'Tech Debt', icon: Wrench, color: '#5B6B85' },
};

export default function IssueTypeBadge({ type, className, iconOnly = false }) {
  const cfg = CONFIG[type] || CONFIG.task;
  const Icon = cfg.icon;
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', className)}
      style={{ backgroundColor: `${cfg.color}1A`, color: cfg.color }}
      title={cfg.label}
    >
      <Icon className="h-3 w-3" />
      {!iconOnly && cfg.label}
    </span>
  );
}
