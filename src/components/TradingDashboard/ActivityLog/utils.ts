
import { ActivityLogEntry } from '@/types/simulation';
import { CheckCircle, AlertTriangle, XCircle, Info, Zap, Activity } from 'lucide-react';

export const getTypeIcon = (type: ActivityLogEntry['type']) => {
  switch (type) {
    case 'SUCCESS':
      return CheckCircle;
    case 'ERROR':
      return XCircle;
    case 'WARNING':
      return AlertTriangle;
    case 'AI':
      return Zap;
    case 'TRADE':
    case 'API':
    case 'SIM':
    case 'PORTFOLIO_UPDATE':
    case 'MARKET_DATA':
    case 'SYSTEM':
    case 'PERFORMANCE':
      return Activity;
    default:
      return Info;
  }
};

export const getTypeColor = (type: ActivityLogEntry['type']) => {
  switch (type) {
    case 'ERROR':
      return 'text-red-400';
    case 'SUCCESS':
      return 'text-green-400';
    case 'WARNING':
      return 'text-yellow-400';
    case 'AI':
      return 'text-blue-400';
    case 'TRADE':
      return 'text-purple-400';
    case 'API':
      return 'text-orange-400';
    case 'SIM':
      return 'text-cyan-400';
    case 'PORTFOLIO_UPDATE':
      return 'text-cyan-400';
    case 'MARKET_DATA':
      return 'text-orange-400';
    case 'SYSTEM':
      return 'text-gray-400';
    case 'PERFORMANCE':
      return 'text-emerald-400';
    default:
      return 'text-slate-300';
  }
};

export const getIconColor = (type: ActivityLogEntry['type']) => {
  switch (type) {
    case 'SUCCESS':
      return 'text-green-400';
    case 'ERROR':
      return 'text-red-400';
    case 'WARNING':
      return 'text-yellow-400';
    case 'AI':
      return 'text-blue-400';
    case 'TRADE':
      return 'text-purple-400';
    case 'API':
      return 'text-orange-400';
    case 'SIM':
      return 'text-cyan-400';
    case 'PORTFOLIO_UPDATE':
      return 'text-cyan-400';
    case 'MARKET_DATA':
      return 'text-orange-400';
    case 'SYSTEM':
      return 'text-gray-400';
    case 'PERFORMANCE':
      return 'text-emerald-400';
    default:
      return 'text-slate-400';
  }
};

export const hasDetails = (entry: ActivityLogEntry) => {
  return (entry.details && Object.keys(entry.details).length > 0) || 
         (entry.meta && Object.keys(entry.meta).length > 0);
};
