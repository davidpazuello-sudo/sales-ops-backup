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
  reports: string[][];
  error?: string;
};

export type DashboardFallbackOptions = {
  source?: string;
  loading?: string;
  status?: string;
  error?: string;
};
