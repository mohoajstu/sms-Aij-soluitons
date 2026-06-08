export const diffFormData = (prevFormData = {}, nextFormData = {}) => {
  const keys = new Set([...Object.keys(prevFormData || {}), ...Object.keys(nextFormData || {})])
  const changed = []
  keys.forEach((key) => {
    const prev = prevFormData ? prevFormData[key] : undefined
    const next = nextFormData ? nextFormData[key] : undefined
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      changed.push(key)
    }
  })
  return changed
}

export const timestampToMillis = (value) => {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value

  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

const toIsoString = (value, fallbackMillis) => {
  if (typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) {
    return value
  }

  const millis = timestampToMillis(value) || fallbackMillis || 0
  return new Date(millis).toISOString()
}

export const normalizeVersions = (versions, maxVersions) => {
  const safe = Array.isArray(versions) ? versions : []
  const sorted = [...safe].sort((a, b) => {
    const aTime = timestampToMillis(a.savedAt)
    const bTime = timestampToMillis(b.savedAt)
    return aTime - bTime
  })
  return typeof maxVersions === 'number' ? sorted.slice(-maxVersions) : sorted
}

export const getLatestFormData = (draftData) => {
  const versions = normalizeVersions(draftData?.versions)
  if (versions.length > 0) {
    return versions[versions.length - 1].formData || draftData.formData || {}
  }
  return draftData?.formData || {}
}

export const buildVersionEntry = (draftData, nextFormData, prevFormData) => ({
  savedAt: new Date().toISOString(),
  savedBy: draftData.uid,
  teacherName: draftData.teacherName,
  term: draftData.term,
  formData: nextFormData,
  changedFields: diffFormData(prevFormData, nextFormData),
})

export const appendDraftVersion = (
  existingVersions,
  draftData,
  nextFormData,
  prevFormData,
  maxVersions,
) => {
  const entry = buildVersionEntry(draftData, nextFormData, prevFormData)
  return normalizeVersions([...(existingVersions || []), entry], maxVersions)
}

export const appendDraftBaselineVersion = (
  existingVersions,
  draftData,
  nextFormData,
  maxVersions,
) => {
  const entry = {
    ...buildVersionEntry(draftData, nextFormData, {}),
    changedFields: Object.keys(nextFormData || {}),
    consolidatedBaseline: true,
  }
  return normalizeVersions([...(existingVersions || []), entry], maxVersions)
}

export const buildDraftHistoryEntries = (draftRecord = {}) => {
  const draftData = draftRecord.data || draftRecord
  const fallbackMillis =
    timestampToMillis(draftData.lastModified) ||
    timestampToMillis(draftData.updatedAt) ||
    timestampToMillis(draftData.createdAt)

  const entries = normalizeVersions(draftData.versions).map((version, index) => {
    const savedAtMillis = timestampToMillis(version.savedAt) || fallbackMillis || index + 1
    return {
      ...version,
      draftId: version.draftId || draftRecord.id,
      savedAt: toIsoString(version.savedAt, savedAtMillis),
      _savedAtMillis: savedAtMillis,
      _sourceOrder: index,
    }
  })

  const latestVersionFormData = entries[entries.length - 1]?.formData || {}
  const docFormData = draftData.formData || {}
  const docFormDataDiffers = JSON.stringify(latestVersionFormData) !== JSON.stringify(docFormData)

  if (Object.keys(docFormData).length > 0 && (entries.length === 0 || docFormDataDiffers)) {
    const savedAtMillis = fallbackMillis || entries[entries.length - 1]?._savedAtMillis || 1
    entries.push({
      savedAt: toIsoString(
        draftData.lastModified || draftData.updatedAt || draftData.createdAt,
        savedAtMillis,
      ),
      savedBy: draftData.uid,
      teacherName: draftData.teacherName,
      term: draftData.term,
      formData: docFormData,
      changedFields: Object.keys(docFormData),
      draftId: draftRecord.id,
      _savedAtMillis: savedAtMillis,
      _sourceOrder: entries.length,
    })
  }

  return entries
}

export const consolidateDraftVersionHistories = (draftRecords = []) => {
  const historyEntries = draftRecords
    .flatMap((draftRecord, draftIndex) =>
      buildDraftHistoryEntries(draftRecord).map((entry) => ({
        ...entry,
        _draftIndex: draftIndex,
      })),
    )
    .sort((a, b) => {
      if (a._savedAtMillis !== b._savedAtMillis) return a._savedAtMillis - b._savedAtMillis
      if (a._draftIndex !== b._draftIndex) return a._draftIndex - b._draftIndex
      return a._sourceOrder - b._sourceOrder
    })

  const formData = {}

  historyEntries.forEach((entry) => {
    const snapshot = entry.formData || {}
    let fields = Array.isArray(entry.changedFields) ? entry.changedFields : Object.keys(snapshot)

    if (fields.length === 0 && Object.keys(formData).length === 0) {
      fields = Object.keys(snapshot)
    }

    fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(snapshot, field)) {
        formData[field] = snapshot[field]
      }
    })
  })

  const versions = historyEntries.map((entry) => {
    const { _draftIndex, _savedAtMillis, _sourceOrder, ...version } = entry
    return version
  })

  return {
    formData,
    versions,
    sourceDraftIds: [...new Set(versions.map((version) => version.draftId).filter(Boolean))],
  }
}
