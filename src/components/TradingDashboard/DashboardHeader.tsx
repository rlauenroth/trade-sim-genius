
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, RefreshCw, LogOut } from 'lucide-react';
import { AIHealthBadge } from '@/components/AIHealthBadge';

interface DashboardHeaderProps {
  onSettingsClick: () => void;
  onRefreshClick: () => void;
  onLogoutClick: () => void;
  isRefreshing?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onSettingsClick,
  onRefreshClick,
  onLogoutClick,
  isRefreshing = false
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Trading Dashboard</h1>
        <AIHealthBadge />
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshClick}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="outline"
          size="sm"
          onClick={onSettingsClick}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Einstellungen
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onLogoutClick}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </div>
  );
};
