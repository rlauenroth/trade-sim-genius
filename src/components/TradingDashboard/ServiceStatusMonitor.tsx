
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { serviceRegistry } from '@/services/serviceRegistry';

interface ServiceStatusMonitorProps {
  onRetryService?: (serviceName: string) => void;
}

const ServiceStatusMonitor = ({ onRetryService }: ServiceStatusMonitorProps) => {
  const [services, setServices] = React.useState(serviceRegistry.getServicesStatus());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setServices(serviceRegistry.getServicesStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (initialized: boolean, error?: string) => {
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (initialized) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (initialized: boolean, error?: string) => {
    if (error) return <Badge variant="destructive">Fehler</Badge>;
    if (initialized) return <Badge variant="default" className="bg-green-600">Bereit</Badge>;
    return <Badge variant="secondary">Initialisiert...</Badge>;
  };

  if (services.length === 0) {
    return null;
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">Service Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between p-2 bg-slate-700 rounded">
            <div className="flex items-center space-x-2">
              {getStatusIcon(service.initialized, service.error)}
              <span className="text-white text-sm font-medium">{service.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(service.initialized, service.error)}
              {service.error && onRetryService && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRetryService(service.name)}
                  className="h-6 px-2"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {services.some(s => s.error) && (
          <div className="mt-3 p-2 bg-red-900/20 border border-red-500/20 rounded">
            <p className="text-red-300 text-xs">
              Einige Services sind nicht verfügbar. Dies kann die Funktionalität beeinträchtigen.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceStatusMonitor;
