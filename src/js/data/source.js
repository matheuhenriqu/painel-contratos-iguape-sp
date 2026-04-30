export function getSourceData() {
  return normalizeSourceData(window.CONTRATOS_DATA);
}

export function normalizeSourceData(data) {
  if (!data || !Array.isArray(data.records)) {
    return { records: [], generatedAt: null };
  }
  return data;
}
