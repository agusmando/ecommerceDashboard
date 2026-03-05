import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from './Card';
import type { KPI } from '../types';

interface KPICardProps {
  kpi: KPI;
}

export function KPICard({ kpi }: KPICardProps) {
  return (
    <Card>
      <div className="flex flex-col">
        <div className="text-sm text-muted-foreground mb-1">{kpi.label}</div>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-semibold text-foreground">{kpi.value}</div>
          {kpi.change !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${
              kpi.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {kpi.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              <span>{Math.abs(kpi.change)}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
