export type InsightData = {
  performanceTrend: { month: string; avgScore: number; participation: number }[]
  difficultyAnalysis: { category: string; avgScore: number; totalAttempts: number; hardestTopic: string }[]
  predictions: { metric: string; current: number; predicted: number; confidence: number; trend: "up" | "down" | "stable" }[]
  aiRecommendations: { title: string; description: string; impact: "high" | "medium" | "low"; category: string }[]
  cheatRiskScore: number
  engagementScore: number
  retentionRate: number
  averageSessionDuration: number
}

export const DEMO_INSIGHT_DATA: InsightData = {
  performanceTrend: [
    { month: "Jan", avgScore: 62, participation: 120 },
    { month: "Feb", avgScore: 65, participation: 185 },
    { month: "Mar", avgScore: 68, participation: 240 },
    { month: "Apr", avgScore: 71, participation: 310 }
  ],
  difficultyAnalysis: [
    { category: "General Knowledge", avgScore: 72, totalAttempts: 1520, hardestTopic: "Indian Constitution" },
    { category: "Science", avgScore: 58, totalAttempts: 890, hardestTopic: "Organic Chemistry" },
    { category: "Mathematics", avgScore: 65, totalAttempts: 750, hardestTopic: "Probability" },
    { category: "Current Affairs", avgScore: 70, totalAttempts: 1100, hardestTopic: "International Relations" },
    { category: "History", avgScore: 68, totalAttempts: 680, hardestTopic: "Modern India" }
  ],
  predictions: [
    { metric: "Monthly Active Users", current: 850, predicted: 1200, confidence: 78, trend: "up" },
    { metric: "Quiz Completions", current: 3200, predicted: 4800, confidence: 82, trend: "up" },
    { metric: "Revenue (₹)", current: 45000, predicted: 72000, confidence: 71, trend: "up" },
    { metric: "Churn Rate (%)", current: 12, predicted: 8, confidence: 65, trend: "down" }
  ],
  aiRecommendations: [
    {
      title: "Increase Science quiz frequency",
      description:
        "Science category has high engagement but low supply. Adding 2 more weekly quizzes could boost participation by 25%.",
      impact: "high",
      category: "Content"
    },
    {
      title: "Implement adaptive difficulty",
      description: "40% of students score below 50%. Enabling AI adaptive mode could improve retention by 18%.",
      impact: "high",
      category: "AI"
    },
    {
      title: "Launch referral campaign",
      description:
        "Top 10% of users have avg 3.2 referrals. A double-reward campaign for top performers could grow user base by 30%.",
      impact: "medium",
      category: "Growth"
    },
    {
      title: "Add weekend tournaments",
      description: "Engagement drops 45% on weekends. Weekend tournaments with higher prizes could capture this audience.",
      impact: "medium",
      category: "Engagement"
    },
    {
      title: "Optimize question bank",
      description: "127 questions have <10% correct rate. Review and adjust or replace to maintain fairness.",
      impact: "low",
      category: "Quality"
    },
    {
      title: "Deploy organization trial program",
      description: "3 schools have expressed interest. A 30-day free Enterprise trial could convert to ₹15K MRR.",
      impact: "high",
      category: "Revenue"
    }
  ],
  cheatRiskScore: 8,
  engagementScore: 74,
  retentionRate: 68,
  averageSessionDuration: 12.5
}

function clampInsight(d: Partial<InsightData>): InsightData {
  const base = DEMO_INSIGHT_DATA
  return {
    performanceTrend: Array.isArray(d.performanceTrend) && d.performanceTrend.length ? d.performanceTrend : base.performanceTrend,
    difficultyAnalysis:
      Array.isArray(d.difficultyAnalysis) && d.difficultyAnalysis.length ? d.difficultyAnalysis : base.difficultyAnalysis,
    predictions: Array.isArray(d.predictions) && d.predictions.length ? d.predictions : base.predictions,
    aiRecommendations:
      Array.isArray(d.aiRecommendations) && d.aiRecommendations.length ? d.aiRecommendations : base.aiRecommendations,
    cheatRiskScore: typeof d.cheatRiskScore === "number" ? Math.max(0, Math.min(100, d.cheatRiskScore)) : base.cheatRiskScore,
    engagementScore:
      typeof d.engagementScore === "number" ? Math.max(0, Math.min(100, d.engagementScore)) : base.engagementScore,
    retentionRate:
      typeof d.retentionRate === "number" ? Math.max(0, Math.min(100, d.retentionRate)) : base.retentionRate,
    averageSessionDuration:
      typeof d.averageSessionDuration === "number" ? d.averageSessionDuration : base.averageSessionDuration
  }
}

export function parseInsightJson(raw: string): InsightData {
  let t = raw.trim()
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (m) t = m[1].trim()
  try {
    const j = JSON.parse(t) as Partial<InsightData>
    return clampInsight(j)
  } catch {
    return DEMO_INSIGHT_DATA
  }
}
