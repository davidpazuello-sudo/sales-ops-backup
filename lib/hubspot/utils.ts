import type { HubSpotRecord } from "../types/hubspot";

export function dedupeHubSpotRecords(records: HubSpotRecord[] = []): HubSpotRecord[] {
  const uniqueRecords = new Map<string, HubSpotRecord>();
  for (const record of records) {
    const id = String(record?.id || "").trim();
    if (id && !uniqueRecords.has(id)) {
      uniqueRecords.set(id, record);
    }
  }
  return [...uniqueRecords.values()];
}

export function chunkItems<T>(items: T[] = [], chunkSize: number = 5): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

export function normalizeComparable(value: unknown): string {
  return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function normalizeSellerPage(value: unknown): string {
  const parsed = Number.parseInt(String(value || "1").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "1";
  }
  return String(parsed);
}
