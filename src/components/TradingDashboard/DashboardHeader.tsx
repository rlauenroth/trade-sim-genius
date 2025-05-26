
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Settings, LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  isSimulationActive: boolean;
  isPaused?: boolean;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const DashboardHeader = ({ isSimulationActive, isPaused, onLogout, onOpenSettings }: DashboardHeaderProps) => {
  const getStatusBadge = () => {
    if (!isSimulationActive) {
      return <Badge variant="secondary" className="bg-slate-600">Bereit</Badge>;
    }
    
    if (isPaused) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-400">Pausiert</Badge>;
    }
    
    return <Badge className="bg-green-600">Simulation aktiv</Badge>;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">KI Trading Assistant</h1>
            <p className="text-slate-400">Paper-Trading Dashboard</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={onOpenSettings} className="text-slate-400">
          <Settings className="h-4 w-4 mr-2" />
          Einstellungen
        </Button>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-400">
          <LogOut className="h-4 w-4 mr-2" />
          Abmelden
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
