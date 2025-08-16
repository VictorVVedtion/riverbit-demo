import { poolData } from '../data/riverPoolData';

export const handleDeposit = async (
  depositAmount: string,
  setIsDepositing: (value: boolean) => void,
  setDepositAmount: (value: string) => void
) => {
  if (!depositAmount || parseFloat(depositAmount) <= 0) return;
  
  setIsDepositing(true);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  alert(`成功存入 ${depositAmount} USDC，获得 ${(parseFloat(depositAmount) / poolData.rLPPrice).toFixed(6)} rLP`);
  setDepositAmount('');
  setIsDepositing(false);
};

export const handleWithdraw = async (
  withdrawAmount: string,
  setIsWithdrawing: (value: boolean) => void,
  setWithdrawAmount: (value: string) => void,
  riskStatus: { drawdown: string }
) => {
  if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
  
  setIsWithdrawing(true);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const withdrawFee = riskStatus.drawdown === 'danger' ? 0.01 : 0;
  const finalAmount = parseFloat(withdrawAmount) * (1 - withdrawFee);
  
  alert(`成功提取 ${finalAmount.toFixed(2)} USDC${withdrawFee > 0 ? `（扣除 1% 退出費）` : ''}`);
  setWithdrawAmount('');
  setIsWithdrawing(false);
};