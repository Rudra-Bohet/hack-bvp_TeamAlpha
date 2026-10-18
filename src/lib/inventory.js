export function stockCover(stock, dailyUsage) {
  const days = dailyUsage > 0 ? stock / dailyUsage : null;
  return {
    days,
    status: days === null ? "unknown" : days < 7 ? "critical" : days < 30 ? "warning" : "healthy",
  };
}
