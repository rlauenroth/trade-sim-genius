
import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Wifi, Copy, X } from 'lucide-react';
import { KUCOIN_PROXY_BASE } from '@/config';
import { useProxyConnection } from '@/hooks/useProxyConnection';
import { toast } from '@/hooks/use-toast';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDrawer = ({ isOpen, onClose }: SettingsDrawerProps) => {
  const { isTestingProxy, proxyStatus, testConnection } = useProxyConnection();

  const copyProxyUrl = () => {
    const fullUrl = `${window.location.origin}${KUCOIN_PROXY_BASE}`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: "URL kopiert",
      description: "Proxy-URL wurde in die Zwischenablage kopiert.",
    });
  };

  const getStatusBadge = () => {
    switch (proxyStatus) {
      case 'connected':
        return <Badge className="bg-green-600 text-white">Verbunden</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white">Fehler</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Unbekannt</Badge>;
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-slate-800 border-slate-700">
        <DrawerHeader>
          <DrawerTitle className="text-white flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Einstellungen</span>
          </DrawerTitle>
          <DrawerClose className="absolute right-4 top-4">
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6">
          {/* Network & Proxy Section */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <Wifi className="h-5 w-5" />
                <span>Netzwerk & Proxy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Proxy-Status</Label>
                <div className="flex items-center justify-between mt-1">
                  {getStatusBadge()}
                  <Button
                    onClick={testConnection}
                    disabled={isTestingProxy}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300"
                  >
                    {isTestingProxy ? 'Teste...' : 'Verbindung testen'}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Proxy-URL</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={`${window.location.origin}${KUCOIN_PROXY_BASE}`}
                    readOnly
                    className="bg-slate-800 border-slate-600 text-slate-200 text-sm"
                  />
                  <Button
                    onClick={copyProxyUrl}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Alle KuCoin-API-Aufrufe werden über diesen Proxy geleitet.
                </div>
              </div>

              <div className="bg-slate-800 p-3 rounded border border-slate-600">
                <div className="text-sm text-slate-300 font-medium mb-2">Netzwerk-Informationen</div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>• CORS-Probleme werden durch PHP-Proxy umgangen</div>
                  <div>• Automatische Rate-Limit-Behandlung</div>
                  <div>• Fallback auf Mock-Daten bei Verbindungsproblemen</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys Section */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg">API-Schlüssel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                API-Schlüssel werden verschlüsselt im Browser-Speicher verwaltet.
                Änderungen erfordern eine Neuanmeldung.
              </div>
            </CardContent>
          </Card>
        </div>

        <DrawerFooter>
          <Button onClick={onClose} className="w-full">
            Schließen
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsDrawer;
