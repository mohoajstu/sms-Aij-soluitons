export const toggleErsOption = (formData, name, checked) => {
  const next = { ...formData, [name]: checked }

  if (checked) {
    if (name === 'ERSCompletedYes') {
      next.ERSCompletedNo = false
      next.ERSCompletedNA = false
    }
    if (name === 'ERSCompletedNo') {
      next.ERSCompletedYes = false
      next.ERSCompletedNA = false
    }
    if (name === 'ERSCompletedNA') {
      next.ERSCompletedYes = false
      next.ERSCompletedNo = false
    }
    if (name === 'ERSBenchmarkYes') {
      next.ERSBenchmarkNo = false
      next.ERSBenchmarkNA = false
    }
    if (name === 'ERSBenchmarkNo') {
      next.ERSBenchmarkYes = false
      next.ERSBenchmarkNA = false
    }
    if (name === 'ERSBenchmarkNA') {
      next.ERSBenchmarkYes = false
      next.ERSBenchmarkNo = false
    }
  }

  return next
}
