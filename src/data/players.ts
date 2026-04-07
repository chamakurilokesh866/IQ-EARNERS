export type Player = {
  name: string
  title: string
  bio: string
  score: number
  quizzes: number
  winRate: number
  achievements: string[]
  links: { label: string; href: string }[]
}

export const PLAYERS: Record<string, Player> = {
  "Priya Sharma": {
    name: "Priya Sharma",
    title: "Elite Champion",
    bio: "Quiz enthusiast with a passion for tech and geography. Loves competitive trivia nights.",
    score: 15420,
    quizzes: 156,
    winRate: 94,
    achievements: ["🏆 Champion", "🔥 Streak 45", "⚡ Speedster"],
    links: [
      { label: "Portfolio", href: "#" },
      { label: "LinkedIn", href: "#" },
      { label: "GitHub", href: "#" }
    ]
  },
  "Rahul Verma": {
    name: "Rahul Verma",
    title: "Rising Star",
    bio: "General knowledge expert and daily quiz grinder. Focused on accuracy.",
    score: 15180,
    quizzes: 148,
    winRate: 92,
    achievements: ["🥈 Runner-up", "🔥 Streak 38"],
    links: [
      { label: "Portfolio", href: "#" },
      { label: "LinkedIn", href: "#" }
    ]
  },
  "Ananya Patel": {
    name: "Ananya Patel",
    title: "Rising Star",
    bio: "History and culture buff who enjoys fast-paced tournaments.",
    score: 14890,
    quizzes: 142,
    winRate: 91,
    achievements: ["🥉 Third Place", "⚡ Fast Answers"],
    links: [
      { label: "Portfolio", href: "#" },
      { label: "Twitter", href: "#" }
    ]
  },
  "Vikram Singh": {
    name: "Vikram Singh",
    title: "Top 5",
    bio: "Science trivia specialist with consistent high win rate.",
    score: 14650,
    quizzes: 139,
    winRate: 90,
    achievements: ["🔬 Science Pro"],
    links: [{ label: "Portfolio", href: "#" }]
  },
  "Sneha Reddy": {
    name: "Sneha Reddy",
    title: "Top 5",
    bio: "Tech and entertainment categories champion.",
    score: 14320,
    quizzes: 135,
    winRate: 89,
    achievements: ["🎬 Entertainment Ace"],
    links: [{ label: "Portfolio", href: "#" }]
  },
  "Arjun Mehta": {
    name: "Arjun Mehta",
    title: "Top 10",
    bio: "Precision and patience lead the way.",
    score: 14000,
    quizzes: 132,
    winRate: 88,
    achievements: ["🎯 Accuracy"],
    links: [{ label: "Portfolio", href: "#" }]
  },
  "Kavya Iyer": {
    name: "Kavya Iyer",
    title: "Top 10",
    bio: "Geography lover and map geek.",
    score: 13850,
    quizzes: 128,
    winRate: 87,
    achievements: ["🗺️ Geo Guru"],
    links: [{ label: "Portfolio", href: "#" }]
  },
  "Rohan Kapoor": {
    name: "Rohan Kapoor",
    title: "Top 10",
    bio: "Daily quiz participant, strong streak maintenance.",
    score: 13620,
    quizzes: 125,
    winRate: 86,
    achievements: ["🔥 Streaker"],
    links: [{ label: "Portfolio", href: "#" }]
  },
  "Divya Nair": {
    name: "Divya Nair",
    title: "Top 10",
    bio: "Quick learner focusing on diverse topics.",
    score: 13380,
    quizzes: 122,
    winRate: 85,
    achievements: ["⚡ Speed Answers"],
    links: [{ label: "Portfolio", href: "#" }]
  },
  "Aditya Gupta": {
    name: "Aditya Gupta",
    title: "Top 10",
    bio: "Balanced approach across categories.",
    score: 13150,
    quizzes: 119,
    winRate: 84,
    achievements: ["📚 All-rounder"],
    links: [{ label: "Portfolio", href: "#" }]
  }
}
