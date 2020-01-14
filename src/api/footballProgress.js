export const createProgress = () => {
  let progress = 0

  return {
    get: () => progress,
    set: (current) => (progress = current),
  }
}
