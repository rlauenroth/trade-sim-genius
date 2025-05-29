
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { VerificationStatus } from '@/types/settingsV2';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface VerificationBadgeProps {
  status: VerificationStatus;
  message?: string;
}

const VerificationBadge = ({ status, message }: VerificationBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          text: 'Verifiziert',
          className: 'bg-green-600 text-white',
          color: 'text-green-500'
        };
      case 'error':
        return {
          icon: XCircle,
          text: 'Fehler',
          className: 'bg-red-600 text-white',
          color: 'text-red-500'
        };
      case 'testing':
        return {
          icon: Loader2,
          text: 'Teste...',
          className: 'bg-blue-600 text-white',
          color: 'text-blue-500'
        };
      default:
        return {
          icon: Clock,
          text: 'Ungetestet',
          className: 'bg-gray-600 text-white',
          color: 'text-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-2">
      <Badge className={config.className}>
        <Icon className={`h-3 w-3 mr-1 ${status === 'testing' ? 'animate-spin' : ''}`} />
        {config.text}
      </Badge>
      {message && (
        <span className={`text-xs ${config.color}`}>
          {message}
        </span>
      )}
    </div>
  );
};

export default VerificationBadge;
