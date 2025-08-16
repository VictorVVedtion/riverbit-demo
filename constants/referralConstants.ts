import { Crown, Star, UserPlus } from 'lucide-react';

export const userTypeData = {
  foundation: {
    level: 'Foundation 社區長',
    badge: 'Foundation級',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    icon: Crown,
    totalInvited: 234,
    activeUsers: 89,
    totalVolume: 4500000,
    tokenEarned: 450000,
    commissionEarned: 18750,
    rebateRate: 40,
    maxRebateRate: 40,
    tierLevels: 3,
    nextLevelRequirement: null,
    dailyActiveUsers: 35,
    consecutiveActiveDays: 12,
    specialPrivileges: [
      '固定10萬RBT代幣獎勵',
      '最高40%返佣比例',
      '3級分銷體系',
      '專屬VIP客服',
      '平台治理投票權'
    ],
    growthPath: null // Foundation级已是最高级
  },
  community: {
    level: '非Foundation 社區長',
    badge: '社區長',
    badgeColor: 'bg-blue-100 text-blue-800',
    icon: Star,
    totalInvited: 156,
    activeUsers: 45,
    totalVolume: 2100000,
    tokenEarned: 180000,
    commissionEarned: 8750,
    rebateRate: 35,
    maxRebateRate: 35,
    tierLevels: 2,
    nextLevelRequirement: {
      targetLevel: 'Foundation 社區長',
      requirements: [
        { label: '邀請用戶數', current: 156, required: 200, unit: '人' },
        { label: '團隊交易量', current: 2100000, required: 3000000, unit: 'USD' },
        { label: '連續活躍天數', current: 8, required: 30, unit: '天' },
        { label: '活躍下級用戶', current: 45, required: 60, unit: '人' }
      ]
    },
    dailyActiveUsers: 25,
    consecutiveActiveDays: 8,
    specialPrivileges: [
      '4%代幣池按比例分配',
      '最高35%返佣比例',
      '2級分銷體系',
      '優先客服支持'
    ],
    growthPath: {
      current: 'community',
      next: 'foundation',
      progress: 65
    }
  },
  c2c: {
    level: 'C2C 用戶',
    badge: 'C2C級',
    badgeColor: 'bg-green-100 text-green-800',
    icon: UserPlus,
    totalInvited: 42,
    activeUsers: 18,
    totalVolume: 580000,
    tokenEarned: 25000,
    commissionEarned: 1450,
    rebateRate: 10,
    maxRebateRate: 10,
    tierLevels: 1,
    nextLevelRequirement: {
      targetLevel: '非Foundation 社區長',
      requirements: [
        { label: '累計交易量', current: 580000, required: 1000000, unit: 'USD' },
        { label: '邀請用戶數', current: 42, required: 80, unit: '人' },
        { label: '活躍下級用戶', current: 18, required: 30, unit: '人' },
        { label: '連續活躍天數', current: 25, required: 60, unit: '天' }
      ]
    },
    dailyActiveUsers: 12,
    consecutiveActiveDays: 25,
    specialPrivileges: [
      '固定10%返佣比例',
      '1級直推體系',
      '基礎數據分析',
      '申請升級通道'
    ],
    growthPath: {
      current: 'c2c',
      next: 'community',
      progress: 42
    }
  }
} as const;

export const mockTeamData = [
  { id: 1, username: 'trader001', level: 'L1', volume: 450000, commission: 1800, status: 'active' },
  { id: 2, username: 'crypto_user', level: 'L1', volume: 320000, commission: 1280, status: 'active' },
  { id: 3, username: 'defi_lover', level: 'L2', volume: 180000, commission: 540, status: 'active' },
  { id: 4, username: 'trader_pro', level: 'L1', volume: 280000, commission: 1120, status: 'inactive' },
  { id: 5, username: 'blockchain_fan', level: 'L2', volume: 95000, commission: 285, status: 'active' }
];

export type UserType = keyof typeof userTypeData;
export type UserTypeData = typeof userTypeData[UserType];