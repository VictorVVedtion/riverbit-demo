export const getLevelColor = (level: string) => {
  if (level.includes('Foundation')) return 'text-yellow-600';
  if (level.includes('社區長')) return 'text-blue-600';
  return 'text-green-600';
};

export const getLevelBadgeVariant = (level: string) => {
  if (level.includes('Foundation')) return 'default';
  if (level.includes('社區長')) return 'secondary';
  return 'outline';
};

export const handleCopyLink = (
  referralLink: string, 
  setCopied: (copied: boolean) => void
) => {
  navigator.clipboard.writeText(referralLink);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

export const getFilteredTeamData = (teamData: any[], tierLevels: number) => {
  return teamData.slice(0, tierLevels === 1 ? 3 : tierLevels === 2 ? 4 : 5);
};