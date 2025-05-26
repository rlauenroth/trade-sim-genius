
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, Settings, Play } from 'lucide-react';

interface FirstTimeUserInfoProps {
  onStartSimulation: () => void;
  onOpenSettings: () => void;
  strategy: string;
  aiModel: string;
}

const FirstTimeUserInfo = ({ onStartSimulation, onOpenSettings, strategy, aiModel }: FirstTimeUserInfoProps) => {
  return (
    <Card className="bg-blue-900/20 border-blue-600/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Info className="h-5 w-5 text-blue-400" />
          <span>Willkommen bei Ihrem KI Trading Assistant!</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-slate-300">
          <p className="mb-3">
            Ihre Portfolio-Daten wurden erfolgreich geladen. Sie können jetzt Ihre erste 
            Simulation starten oder zunächst die Einstellungen anpassen.
          </p>
          
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
            <h4 className="text-white font-medium mb-2">Aktuelle Konfiguration:</h4>
            <div className="text-sm space-y-1">
              <div>Handelsstrategie: <span className="text-blue-400">{strategy}</span></div>
              <div>KI-Modell: <span className="text-blue-400">{aiModel}</span></div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button 
            onClick={onStartSimulation}
            className="bg-green-600 hover:bg-green-700 flex-1"
          >
            <Play className="mr-2 h-4 w-4" />
            Simulation starten
          </Button>
          <Button 
            onClick={onOpenSettings}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Settings className="mr-2 h-4 w-4" />
            Einstellungen
          </Button>
        </div>

        <div className="text-xs text-slate-400 bg-amber-900/20 border border-amber-600/30 rounded p-2">
          💡 Tipp: Sie können die Simulation jederzeit pausieren oder stoppen. 
          Alle Trades werden nur simuliert - Ihr echtes Portfolio bleibt unberührt.
        </div>
      </CardContent>
    </Card>
  );
};

export default FirstTimeUserInfo;
