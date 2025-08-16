export const formatCurrency = (value: number, showValues: boolean) => 
  showValues ? `$${value.toLocaleString()}` : '****';

export const formatCrypto = (value: number, symbol: string, showValues: boolean) => 
  showValues ? `${value} ${symbol}` : `**** ${symbol}`;