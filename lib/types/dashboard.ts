export type OwnerDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  team: string;
};

export type DashboardIntegration = {
  status: string;
  source?: string;
  owners: number;
  deals: number;
  pipelineAmount: number;
  ownerDirectory?: OwnerDirectoryEntry[];
  profileEmail?: string;
  profileRole?: string;
};

export type DashboardSummary = {
  sellersActive: number;
  totalPipeline: number;
  wonThisMonth: number;
  stalledDeals: number;
};

export type SellerSummary = {
  id: string;
  name: string;
  email: string;
  team: string;
  initials: string;
  openDeals: number;
  wonDeals: number;
  stalledDeals: number;
  pipelineAmount: number;
  pipelineLabel: string;
  compactPipeline: string;
  metaPercent: number;
  health: string;
  status: string;
  note: string;
};

export type DashboardDeal = {
  id: string;
  name: string;
  owner: string;
  stage: string;
  amountLabel: string;
  staleLabel: string;
  stageId?: string;
  amount?: number;
  lastTouchDays?: number | null;
};

export type DashboardTask = {
  id: string;
  externalId: string;
  objectType: string;
  kind: string;
  kindLabel: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerTeam: string;
  status: string;
  statusLabel: string;
  isCompleted: boolean;
  isOverdue: boolean;
  dueAt: string | null;
  dueLabel: string;
  priority: string;
  taskTypeLabel: string;
  updatedAt: string | null;
  source: string;
};

export type DashboardMeeting = {
  id: string;
  externalId: string;
  slug: string;
  title: string;
  summary: string;
  meetingAt: string | null;
  dateLabel: string;
  timeLabel: string;
  type: string;
  owner: string;
  ownerEmail: string;
  hubspotOwnerId: string;
  statusLabel: string;
  notes: string;
  audioUrl: string;
  audioLabel: string;
  source: string;
  createdAt: string | null;
};

export type DashboardAuditLog = {
  id: string;
  actor: string;
  action: string;
  when: string;
  route: string;
  level: string;
  source: string;
};

export type DashboardSyncLog = {
  id: string;
  when: string;
  message: string;
  severity: string;
  route: string;
  source: string;
};

export type DashboardNotification = {
  id: string;
  title: string;
  body: string;
  tag: string;
  createdAt: string | null;
  read: boolean;
  trash: boolean;
  requestId: string;
};

export type CampaignGoalStatus = {
  id: string;
  label: string;
  current: number;
  target: number;
  progress: number;
  remaining: number;
  status: string;
};

export type CampaignSummary = {
  id: string;
  name: string;
  source: string;
  prospecting: {
    callsDaily: number;
    callsWeekly: number;
    connectionsDaily: number;
    connectionsWeekly: number;
    dailyCallTarget: number;
    dailyConnectionTarget: number;
  };
  qualification: {
    mqlCount: number;
    sqlCount: number;
    conversionRate: number;
    targetSqls: number;
  };
  sales: {
    proposalCount: number;
    closedWonCount: number;
    conversionRate: number;
    targetClosedWon: number;
  };
  smartGoals: CampaignGoalStatus[];
  meetingCount: number;
  qualifiedOpportunityCount: number;
  lastActivityAt: string | null;
};

export type PipelineStage = {
  id: string;
  label: string;
  count: number;
  totalAmount: number;
  totalLabel: string;
  isClosed: boolean;
};

export type DashboardPipeline = {
  stages: PipelineStage[];
  totalOpenDeals: number;
  totalClosedDeals: number;
};

export type DashboardStates = {
  source: string;
  loading: string;
  empty: {
    sellers: boolean;
    deals: boolean;
    alerts: boolean;
  };
  errors: string[];
};

export type DashboardData = {
  configured: boolean;
  integration: DashboardIntegration;
  summary: DashboardSummary;
  pipeline?: DashboardPipeline;
  states?: DashboardStates;
  sellers: SellerSummary[];
  alerts: string[][];
  deals: DashboardDeal[];
  tasks?: DashboardTask[];
  meetings?: DashboardMeeting[];
  auditLogs?: DashboardAuditLog[];
  syncLogs?: DashboardSyncLog[];
  notifications?: DashboardNotification[];
  campaigns?: CampaignSummary[];
  reports: string[][];
  error?: string;
};

export type DashboardFallbackOptions = {
  source?: string;
  loading?: string;
  status?: string;
  error?: string;
};
