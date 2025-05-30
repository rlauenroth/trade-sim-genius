
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface SnapshotAgeBadgeProps {
  lastUpdate?: number;
  className?: string;
}

export const SnapshotAgeBadge = ({ lastUpdate, className }: SnapshotAgeBadgeProps) => {
  const getAgeInfo = () => {
    if (!lastUpdate) {
      return { text: 'No Data', variant: 'destructive' as const };
    }

    const ageMs = Date.now() - lastUpdate;
    const ageSeconds = Math.floor(ageMs / 1000);

    if (ageSeconds < 30) {
      return { text: 'Live', variant: 'default' as const };
    } else if (ageSeconds < 60) {
      return { text: `${ageSeconds}s`, variant: 'secondary' as const };
    } else {
      const ageMinutes = Math.floor(ageSeconds / 60);
      return { text: `${ageMinutes}m`, variant: 'destructive' as const };
    }
  };

  const { text, variant } = getAgeInfo();

  return (
    <Badge variant={variant} className={`${className} flex items-center gap-1`}>
      <Clock className="h-3 w-3" />
      <span className="text-xs">{text}</span>
    </Badge>
  );
};
