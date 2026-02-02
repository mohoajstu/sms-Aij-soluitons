export const diffFormData = (prevFormData = {}, nextFormData = {}) => {
  const keys = new Set([
    ...Object.keys(prevFormData || {}),
    ...Object.keys(nextFormData || {}),
  ])
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

export const normalizeVersions = (versions, maxVersions) => {
  const safe = Array.isArray(versions) ? versions : []
  const sorted = [...safe].sort((a, b) => {
    const aTime = new Date(a.savedAt || 0).getTime()
    const bTime = new Date(b.savedAt || 0).getTime()
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

export const appendDraftVersion = (existingVersions, draftData, nextFormData, prevFormData, maxVersions) => {
  const entry = buildVersionEntry(draftData, nextFormData, prevFormData)
  return normalizeVersions([...(existingVersions || []), entry], maxVersions)
}
