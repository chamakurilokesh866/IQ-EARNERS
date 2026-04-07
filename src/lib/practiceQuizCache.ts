let practiceQuizCache: any[] | null = null

export function getPracticeQuizCache(): any[] | null {
  return practiceQuizCache
}

export function setPracticeQuizCache(data: any[]): void {
  practiceQuizCache = data
}

export function invalidatePracticeQuizCache(): void {
  practiceQuizCache = null
}
