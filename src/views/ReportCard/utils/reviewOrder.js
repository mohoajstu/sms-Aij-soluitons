export const buildReviewOrderPayload = (orderedReportCards, currentId) => {
  const ids = Array.isArray(orderedReportCards)
    ? orderedReportCards.map((rc) => rc.id).filter(Boolean)
    : []
  const index = currentId ? Math.max(ids.indexOf(currentId), 0) : 0
  return { ids, index }
}
