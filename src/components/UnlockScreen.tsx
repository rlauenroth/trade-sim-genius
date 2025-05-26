
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Unlock } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

const UnlockScreen = () => {
  const { unlockApp, resetApp, isLoading } = useAppState();
  const [password, setPassword] = useState('');
  const [showResetWarning, setShowResetWarning] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    const success = await unlockApp(password);
    if (!success) {
      setPassword('');
    }
  };

  const handleReset = () => {
    if (showResetWarning) {
      resetApp();
    } else {
      setShowResetWarning(true);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600/20 rounded-full">
              <Unlock className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-white">App entsperren</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-slate-300">
                Sicherheitspasswort
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ihr Sicherheitspasswort eingeben"
                autoFocus
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!password || isLoading}
            >
              {isLoading ? 'Entsperren...' : 'App entsperren'}
            </Button>
          </form>

          <div className="border-t border-slate-600 pt-4">
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-2">
                Passwort vergessen?
              </p>
              
              {!showResetWarning ? (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleReset}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  App zurücksetzen
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-900/30 border border-red-600 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="font-medium text-red-400 text-sm">Warnung</span>
                    </div>
                    <p className="text-red-200 text-xs">
                      Dies löscht alle gespeicherten API-Schlüssel und Einstellungen unwiderruflich.
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowResetWarning(false)}
                      className="text-slate-400 hover:text-slate-300"
                    >
                      Abbrechen
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleReset}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Alles löschen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnlockScreen;
