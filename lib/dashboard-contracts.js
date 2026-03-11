/**
 * @typedef {Object} DashboardIntegration
 * @property {string} status
 * @property {string} [source]
 * @property {number} owners
 * @property {number} deals
 * @property {number} pipelineAmount
 * @property {Array<{id: string, name: string, email: string, team: string}>} [ownerDirectory]
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
 * @property {string} [stageId]
 * @property {number} [amount]
 * @property {number | null} [lastTouchDays]
 */

/**
 * @typedef {Object} PipelineStage
 * @property {string} id
 * @property {string} label
 * @property {number} count
 * @property {number} totalAmount
 * @property {string} totalLabel
 * @property {boolean} isClosed
 */

/**
 * @typedef {Object} DashboardPipeline
 * @property {PipelineStage[]} stages
 * @property {number} totalOpenDeals
 * @property {number} totalClosedDeals
 */

/**
 * @typedef {Object} DashboardStates
 * @property {string} source
 * @property {string} loading
 * @property {{sellers: boolean, deals: boolean, alerts: boolean}} empty
 * @property {string[]} errors
 */

/**
 * @typedef {Object} DashboardData
 * @property {boolean} configured
 * @property {DashboardIntegration} integration
 * @property {DashboardSummary} summary
 * @property {DashboardPipeline} [pipeline]
 * @property {DashboardStates} [states]
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
    typeof data.summary.stalledDeals === "number" &&
    (!("pipeline" in data) || (
      isRecord(data.pipeline)
      && Array.isArray(data.pipeline.stages)
      && typeof data.pipeline.totalOpenDeals === "number"
      && typeof data.pipeline.totalClosedDeals === "number"
    )) &&
    (!("states" in data) || (
      isRecord(data.states)
      && typeof data.states.source === "string"
      && typeof data.states.loading === "string"
      && isRecord(data.states.empty)
      && typeof data.states.empty.sellers === "boolean"
      && typeof data.states.empty.deals === "boolean"
      && typeof data.states.empty.alerts === "boolean"
      && Array.isArray(data.states.errors)
    ))
  );
}

export function assertDashboardData(data) {
  if (!isDashboardData(data)) {
    throw new Error("DASHBOARD_DATA_INVALID");
  }

  return data;
}
