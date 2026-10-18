export function stockCover(stock: number, dailyUsage: number) {
  const days = dailyUsage > 0 ? stock / dailyUsage : null;
  return {
    days,
    status: days === null ? "unknown" : days < 7 ? "critical" : days < 30 ? "warning" : "healthy",
  } as const;
}
