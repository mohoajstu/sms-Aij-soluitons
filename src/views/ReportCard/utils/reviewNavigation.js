export const getNextDraftId = (orderIds, currentId, direction) => {
  if (!Array.isArray(orderIds) || orderIds.length === 0 || !currentId) return null
  const currentIndex = orderIds.indexOf(currentId)
  if (currentIndex === -1) return null
  const nextIndex =
    direction === 'next'
      ? (currentIndex + 1) % orderIds.length
      : currentIndex === 0
      ? orderIds.length - 1
      : currentIndex - 1
  return orderIds[nextIndex] || null
}
