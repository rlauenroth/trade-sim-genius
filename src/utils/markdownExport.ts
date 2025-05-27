
import { ActivityLogEntry } from '@/types/simulation';
import { formatCurrency } from './formatters';

export const generateMarkdownReport = (
  activityLog: ActivityLogEntry[],
  simulationData?: {
    startTime: number;
    endTime?: number;
    startValue: number;
    currentValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    totalTrades: number;
  }
): string => {
  const now = new Date();
  const startDate = simulationData?.startTime ? new Date(simulationData.startTime) : null;
  const endDate = simulationData?.endTime ? new Date(simulationData.endTime) : now;
  
  let markdown = `# KI Trading Assistant - Aktivitätsbericht\n\n`;
  
  // Report metadata
  markdown += `**Generiert am:** ${now.toLocaleString('de-DE')}\n\n`;
  
  // Simulation overview
  if (simulationData) {
    markdown += `## 📊 Simulationsübersicht\n\n`;
    markdown += `- **Startzeit:** ${startDate?.toLocaleString('de-DE') || 'N/A'}\n`;
    markdown += `- **Endzeit:** ${endDate.toLocaleString('de-DE')}\n`;
    
    if (startDate) {
      const duration = endDate.getTime() - startDate.getTime();
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      markdown += `- **Dauer:** ${hours}h ${minutes}m\n`;
    }
    
    markdown += `- **Startkapital:** ${formatCurrency(simulationData.startValue)}\n`;
    markdown += `- **Endkapital:** ${formatCurrency(simulationData.currentValue)}\n`;
    markdown += `- **Gesamt P&L:** ${simulationData.totalPnL >= 0 ? '+' : ''}${formatCurrency(simulationData.totalPnL)} (${simulationData.totalPnLPercent.toFixed(2)}%)\n`;
    markdown += `- **Anzahl Trades:** ${simulationData.totalTrades}\n\n`;
  }
  
  // Event summary
  const eventCounts = activityLog.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  markdown += `## 📈 Ereignisübersicht\n\n`;
  Object.entries(eventCounts).forEach(([type, count]) => {
    const emoji = getTypeEmoji(type);
    markdown += `- ${emoji} **${type}:** ${count} Ereignisse\n`;
  });
  markdown += `\n`;
  
  // Trade summary
  const tradeEntries = activityLog.filter(entry => entry.type === 'TRADE' && entry.details?.tradeData);
  if (tradeEntries.length > 0) {
    markdown += `## 💼 Trade-Zusammenfassung\n\n`;
    tradeEntries.forEach((entry, index) => {
      const trade = entry.details!.tradeData!;
      markdown += `### Trade ${index + 1} - ${trade.assetPair}\n`;
      markdown += `- **Typ:** ${trade.type}\n`;
      markdown += `- **Menge:** ${trade.quantity.toFixed(6)}\n`;
      markdown += `- **Preis:** ${formatCurrency(trade.price)}\n`;
      markdown += `- **Gesamtwert:** ${formatCurrency(trade.totalValue)}\n`;
      markdown += `- **Gebühr:** ${formatCurrency(trade.fee)}\n`;
      markdown += `- **Zeit:** ${new Date(entry.timestamp).toLocaleString('de-DE')}\n\n`;
    });
  }
  
  // AI Signals summary
  const signalEntries = activityLog.filter(entry => entry.type === 'AI' && entry.details?.signalData);
  if (signalEntries.length > 0) {
    markdown += `## 🤖 KI-Signal Analyse\n\n`;
    signalEntries.forEach((entry, index) => {
      const signal = entry.details!.signalData!;
      markdown += `### Signal ${index + 1} - ${signal.assetPair}\n`;
      markdown += `- **Typ:** ${signal.signalType}\n`;
      markdown += `- **Entry Preis:** ${signal.entryPriceSuggestion}\n`;
      markdown += `- **Take Profit:** ${formatCurrency(signal.takeProfitPrice)}\n`;
      markdown += `- **Stop Loss:** ${formatCurrency(signal.stopLossPrice)}\n`;
      if (signal.confidenceScore) {
        markdown += `- **Konfidenz:** ${Math.round(signal.confidenceScore * 100)}%\n`;
      }
      if (signal.reasoning) {
        markdown += `- **Begründung:** ${signal.reasoning}\n`;
      }
      markdown += `- **Zeit:** ${new Date(entry.timestamp).toLocaleString('de-DE')}\n\n`;
    });
  }
  
  // Chronological event log
  markdown += `## 📅 Chronologisches Ereignisprotokoll\n\n`;
  
  activityLog.forEach(entry => {
    const time = new Date(entry.timestamp).toLocaleString('de-DE');
    const emoji = getTypeEmoji(entry.type);
    
    markdown += `### ${emoji} ${time} - ${entry.type}\n`;
    markdown += `**${entry.message}**\n`;
    
    if (entry.source) {
      markdown += `*Quelle: ${entry.source}*\n`;
    }
    
    if (entry.details?.portfolioData) {
      const portfolio = entry.details.portfolioData;
      markdown += `- Portfolio: ${formatCurrency(portfolio.valueBefore)} → ${formatCurrency(portfolio.valueAfter)} (${portfolio.changePercent >= 0 ? '+' : ''}${portfolio.changePercent.toFixed(2)}%)\n`;
    }
    
    markdown += `\n`;
  });
  
  // Footer
  markdown += `---\n`;
  markdown += `*Generiert von KI Trading Assistant v1.0*\n`;
  
  return markdown;
};

const getTypeEmoji = (type: string): string => {
  switch (type) {
    case 'SUCCESS': return '✅';
    case 'ERROR': return '❌';
    case 'WARNING': return '⚠️';
    case 'AI': return '🤖';
    case 'TRADE': return '💼';
    case 'PORTFOLIO_UPDATE': return '📊';
    case 'MARKET_DATA': return '📈';
    case 'SYSTEM': return '⚙️';
    case 'PERFORMANCE': return '🎯';
    default: return 'ℹ️';
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};
