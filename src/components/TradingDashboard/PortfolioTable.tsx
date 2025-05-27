
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioPosition } from '@/stores/portfolioStore';
import { formatCurrency } from '@/utils/formatters';

interface PortfolioTableProps {
  positions: PortfolioPosition[];
  totalUSDValue: number;
}

const PortfolioTable = ({ positions, totalUSDValue }: PortfolioTableProps) => {
  // Sort positions by USD value (descending)
  const sortedPositions = [...positions].sort((a, b) => b.usdValue - a.usdValue);
  
  // Filter out zero balances
  const nonZeroPositions = sortedPositions.filter(pos => pos.balance > 0);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Live Portfolio</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-600">
              <TableHead className="text-slate-300">Asset</TableHead>
              <TableHead className="text-slate-300 text-right">Balance</TableHead>
              <TableHead className="text-slate-300 text-right">Verfügbar</TableHead>
              <TableHead className="text-slate-300 text-right">USD-Wert</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nonZeroPositions.map((position) => (
              <TableRow key={position.currency} className="border-slate-600">
                <TableCell className="text-white font-medium">
                  {position.currency}
                </TableCell>
                <TableCell className="text-slate-300 text-right">
                  {position.balance.toFixed(8)}
                </TableCell>
                <TableCell className="text-slate-300 text-right">
                  {position.available.toFixed(8)}
                </TableCell>
                <TableCell className="text-green-400 text-right font-medium">
                  {formatCurrency(position.usdValue)}
                </TableCell>
              </TableRow>
            ))}
            
            {/* Total row */}
            <TableRow className="border-slate-500 border-t-2">
              <TableCell className="text-white font-bold">Total</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell className="text-green-400 text-right font-bold text-lg">
                {formatCurrency(totalUSDValue)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        
        {nonZeroPositions.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            Keine Assets mit Guthaben gefunden
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioTable;
