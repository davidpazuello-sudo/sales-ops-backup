/**
 * @typedef {Object} DashboardIntegration
 * @property {string} status
 * @property {number} owners
 * @property {number} deals
 * @property {number} pipelineAmount
 */

/**
 * @typedef {Object} DashboardSummary
 * @property {number} sellersActive
 * @property {number} totalPipeline
 * @property {number} wonThisMonth
 * @property {number} stalledDeals
 */

/**
 * @typedef {Object} SellerSummary
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} team
 * @property {string} initials
 * @property {number} openDeals
 * @property {number} wonDeals
 * @property {number} stalledDeals
 * @property {number} pipelineAmount
 * @property {string} pipelineLabel
 * @property {string} compactPipeline
 * @property {number} metaPercent
 * @property {string} health
 * @property {string} status
 * @property {string} note
 */

/**
 * @typedef {Object} DashboardDeal
 * @property {string} id
 * @property {string} name
 * @property {string} owner
 * @property {string} stage
 * @property {string} amountLabel
 * @property {string} staleLabel
 */

/**
 * @typedef {Object} DashboardData
 * @property {boolean} configured
 * @property {DashboardIntegration} integration
 * @property {DashboardSummary} summary
 * @property {SellerSummary[]} sellers
 * @property {string[][]} alerts
 * @property {DashboardDeal[]} deals
 * @property {string[][]} reports
 */

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Valida o shape mínimo do payload do dashboard para evitar regressão silenciosa na UI.
 * @param {unknown} data
 * @returns {data is DashboardData}
 */
export function isDashboardData(data) {
  if (!isRecord(data)) return false;
  if (typeof data.configured !== "boolean") return false;
  if (!isRecord(data.integration) || !isRecord(data.summary)) return false;
  if (!Array.isArray(data.sellers) || !Array.isArray(data.alerts) || !Array.isArray(data.deals) || !Array.isArray(data.reports)) return false;

  return (
    typeof data.integration.status === "string" &&
    typeof data.integration.owners === "number" &&
    typeof data.integration.deals === "number" &&
    typeof data.integration.pipelineAmount === "number" &&
    typeof data.summary.sellersActive === "number" &&
    typeof data.summary.totalPipeline === "number" &&
    typeof data.summary.wonThisMonth === "number" &&
    typeof data.summary.stalledDeals === "number"
  );
}

export function assertDashboardData(data) {
  if (!isDashboardData(data)) {
    throw new Error("DASHBOARD_DATA_INVALID");
  }

  return data;
}
