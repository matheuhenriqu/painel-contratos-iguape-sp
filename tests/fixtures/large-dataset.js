(function () {
  const sourceData = window.CONTRATOS_DATA;
  const baseRecords = Array.isArray(sourceData?.records) ? sourceData.records : [];
  if (!baseRecords.length || baseRecords.length >= 1000) return;

  const records = Array.from({ length: 1000 }, (_, index) => {
    const source = baseRecords[index % baseRecords.length];
    const sequence = String(index + 1).padStart(4, '0');

    return {
      ...source,
      id: index + 1,
      contrato: `${source.contrato || 'Contrato'} PERF-${sequence}`,
      processo: `${source.processo || 'Processo'} PERF-${sequence}`,
      objeto: `${source.objeto || 'Objeto sem descrição'} - registro sintético ${sequence}`,
      observacoes: [
        source.observacoes,
        'Fixture sintética para validar rolagem com 1.000 contratos.',
      ]
        .filter(Boolean)
        .join(' | '),
    };
  });

  window.CONTRATOS_DATA = {
    ...sourceData,
    source: `${sourceData.source || 'data/contratos.js'} + fixture de performance`,
    generatedAt: new Date().toISOString(),
    recordCount: records.length,
    records,
  };
})();
