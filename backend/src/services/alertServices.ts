// Logic for Phase 4: Proactive Alerts
export const checkBudgetThresholds = (spent: number, limit: number) => {
  const threshold = 0.8; // 80%
  if (spent >= limit * threshold && spent < limit) {
    return { warning: true, message: "You've reached 80% of your budget!" };
  }
  if (spent >= limit) {
    return { warning: true, message: "Budget exceeded!" };
  }
  return { warning: false };
};
