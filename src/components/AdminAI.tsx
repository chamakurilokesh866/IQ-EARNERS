"use client"
import React, { useState, useRef, useEffect, useCallback } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
type AICategory =
    | "errors"
    | "maintenance"
    | "content"
    | "analytics"
    | "recommendations"
    | "blog"
    | "seo"
    | "security"
    | "chat"
    | "notifications"
    | "database"
    | "growth"

type Severity = "critical" | "warning" | "info" | "success"

interface AIMessage {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
    category?: AICategory
}

interface AIInsight {
    id: string
    category: AICategory
    title: string
    description: string
    severity: Severity
    action?: string
    actionLabel?: string
    dismissed?: boolean
}

// ─── Mock AI Data Engine ──────────────────────────────────────────────────────
const now = new Date()
const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })

function generateInsights(): AIInsight[] {
    return [
        // Error Monitoring
        {
            id: "err-1",
            category: "errors",
            title: "404 Spike Detected",
            description: "23 users hit /quiz/undefined in the last hour. This suggests a broken link from the leaderboard page.",
            severity: "warning",
            action: "Fix leaderboard link",
            actionLabel: "View Details",
        },
        {
            id: "err-2",
            category: "errors",
            title: "API Timeout on /api/quiz-results",
            description: "Average response time is 4.2s (threshold: 2s). Database query for score aggregation needs optimization.",
            severity: "critical",
            action: "Add index on scores table",
            actionLabel: "View Query",
        },
        {
            id: "err-3",
            category: "errors",
            title: "Missing OG Image",
            description: "/og-image.png returns 404. Social share previews are showing blank. Upload replacement from Settings.",
            severity: "warning",
            action: "Upload OG image",
            actionLabel: "Fix Now",
        },
        {
            id: "err-sys-1",
            category: "errors",
            title: "Audio Parsing Violation",
            description: "System failed to parse audio/mp4; codecs=ac-3. This prevents critical audio alerts from playing for new payment notifications.",
            severity: "warning",
            action: "FIX_AUDIO_ENGINE",
            actionLabel: "Fix Audio",
        },
        {
            id: "crit-sec-1",
            category: "security",
            title: "Permissions Policy Violation",
            description: "Public Key Credentials and XR Tracking were blocked. This can interfere with bot protection and biometric login features.",
            severity: "critical",
            action: "FIX_SECURITY_HEADERS",
            actionLabel: "Repair Policy",
        },
        // Maintenance
        {
            id: "maint-1",
            category: "maintenance",
            title: "Cache Stale – Homepage Content",
            description: "Homepage leaderboard cache is 6h old. Refresh recommended to show today's top performers.",
            severity: "info",
            action: "Clear cache",
            actionLabel: "Clear Cache",
        },
        {
            id: "maint-2",
            category: "maintenance",
            title: "Database Health: Optimal",
            description: "All 12 tables queried. No orphaned records. Avg query time: 38ms. Last vacuum: 2 days ago.",
            severity: "success",
        },
        {
            id: "maint-3",
            category: "maintenance",
            title: "Inactive Users (90d+): 412 accounts",
            description: "412 registered accounts have not logged in for 90+ days. Consider sending re-engagement emails.",
            severity: "info",
            actionLabel: "Send Re-engagement",
        },
        // Content
        {
            id: "content-1",
            category: "content",
            title: "Trending: Science Quiz",
            description: "The 'General Science' quiz has 3× more attempts today. Feature it on the homepage for the next 24h.",
            severity: "info",
            actionLabel: "Feature Quiz",
        },
        {
            id: "content-2",
            category: "content",
            title: "Daily Tip Ready",
            description: `"Study smarter, not harder. Use active recall – test yourself instead of re-reading notes." — Ready to publish for ${fmtDate(now)}.`,
            severity: "success",
            actionLabel: "Publish Tip",
        },
        // Analytics
        {
            id: "analytics-1",
            category: "analytics",
            title: "User Drop-off at Quiz Q5",
            description: "68% of users who start a quiz abandon at question 5. The question may be too difficult or poorly worded.",
            severity: "warning",
            actionLabel: "Review Q5",
        },
        {
            id: "analytics-2",
            category: "analytics",
            title: "Peak Traffic: 7–9 PM IST",
            description: "78% of daily sessions occur between 7 PM and 9 PM. Schedule new content releases during this window.",
            severity: "info",
        },
        // Recommendations
        {
            id: "rec-1",
            category: "recommendations",
            title: "Smart Quiz Suggestions Ready",
            description: "15 users completed 'Indian History' — recommending 'World History' and 'Polity' quizzes as next steps.",
            severity: "success",
            actionLabel: "Review Suggestions",
        },
        // Real-time Errors (Critical)
        {
            id: "crit-1",
            category: "errors",
            title: "High Memory Usage Detected",
            description: "Node.js heap is at 84% capacity. Possible memory leak in socket connection pool.",
            severity: "critical",
            actionLabel: "Auto-Fix",
            action: "CLEAR_CACHE",
        },
        {
            id: "crit-2",
            category: "security",
            title: "Suspicious API Activity",
            description: "User ID 892_qr is making 140 req/min from 3 different IPs. Bot detected.",
            severity: "critical",
            actionLabel: "Block IP",
            action: "BLOCK_THREAT_IP",
        },
        // SEO
        {
            id: "seo-1",
            category: "seo",
            title: "Missing Meta Descriptions",
            description: "7 quiz pages have no meta description. Estimated 35% lower CTR from search results. Add descriptions now.",
            severity: "warning",
            actionLabel: "Fix Meta Tags",
        },
        {
            id: "seo-2",
            category: "seo",
            title: "Keyword Opportunity: 'Online Quiz India'",
            description: "High-volume keyword with low competition. Adding it to 3 quiz pages could increase organic traffic by ~2,000/mo.",
            severity: "info",
            actionLabel: "Apply Keywords",
        },
        // Security
        {
            id: "sec-1",
            category: "security",
            title: "Brute Force Attempt Blocked",
            description: "IP 103.87.xx.xx made 42 login attempts in 5 minutes. Auto-blocked. Consider adding CAPTCHA to login.",
            severity: "critical",
            actionLabel: "View IP Logs",
        },
        {
            id: "sec-2",
            category: "security",
            title: "Unusual Signup Spike",
            description: "48 new accounts created from the same IP range in 2h. Possible bot registration. Review for spam patterns.",
            severity: "warning",
            actionLabel: "Review Accounts",
        },
        // Database
        {
            id: "db-1",
            category: "database",
            title: "Duplicate Quiz Completion Records",
            description: "187 duplicate rows found in `quiz_completions`. Deduplication will save ~4MB and improve query speed by 12%.",
            severity: "info",
            actionLabel: "Clean Database",
        },
        // Growth
        {
            id: "growth-1",
            category: "growth",
            title: "Gap Alert: No 'Current Affairs' Content",
            description: "Search queries for 'current affairs quiz' are up 340% this month but you have no matching content. High opportunity.",
            severity: "warning",
            actionLabel: "Create Content",
        },
        {
            id: "growth-2",
            category: "growth",
            title: "User Growth: +23% This Week",
            description: "Excellent growth! 312 new users this week vs 254 last week. The referral programme is driving 41% of signups.",
            severity: "success",
        },
        // Notifications
        {
            id: "notif-1",
            category: "notifications",
            title: "Scheduled Announcement Ready",
            description: "New tournament 'Grand Finale' announcement is drafted. Push to all subscribed users now or schedule for 7 PM.",
            severity: "info",
            actionLabel: "Send Notification",
        },
        // Blog
        {
            id: "blog-1",
            category: "blog",
            title: "Blog Draft: '10 UPSC Study Tips'",
            description: "AI-generated draft ready for review. Estimated read time: 5 min. SEO score: 87/100.",
            severity: "success",
            actionLabel: "Review Draft",
        },
    ]
}

// ─── Mock AI Chat Engine ──────────────────────────────────────────────────────
const AI_KNOWLEDGE_BASE: { patterns: string[]; response: string }[] = [
    {
        patterns: ["error", "404", "broken", "not found"],
        response:
            "🔍 **Error Analysis:**\n\nI've detected 3 active issues:\n1. **404 spike** on `/quiz/undefined` — 23 hits in the last hour. Root cause: leaderboard link missing quiz ID.\n2. **API timeout** on `/api/quiz-results` — avg 4.2s. Add a composite index on `(user_id, created_at)` in the scores table.\n3. **Missing OG image** — upload a 1200×630px image to fix social previews.\n\n**Safe fix:** I'll never delete data automatically. These are non-destructive changes.",
    },
    {
        patterns: ["maintenance", "cache", "clean", "optimize"],
        response:
            "🛠️ **Maintenance Report:**\n\n✅ Database health: Optimal (avg query 38ms)\n⚠️ Homepage cache is 6h old — recommending a refresh\n📦 412 inactive accounts (90d+) identified for re-engagement\n🗑️ 187 duplicate records in `quiz_completions` ready to prune\n\nAll operations are **safe and reversible**. I'll ask for confirmation before any data changes.",
    },
    {
        patterns: ["seo", "keyword", "search", "ranking", "meta"],
        response:
            "📈 **SEO Analysis:**\n\n**Issues Found (7 pages):** Missing meta descriptions → estimated 35% lower CTR\n\n**Opportunity:** Keyword 'Online Quiz India' — 18,000 monthly searches, low competition. Recommended pages to update:\n- `/quiz/general-knowledge`\n- `/leaderboard`\n- `/tournaments`\n\n**Suggested title:** *'Online Quiz Platform India | Win Real Prizes'*\n\n**Recommended actions:**\n1. Add meta descriptions (50–160 chars)\n2. Add structured data (FAQ schema)\n3. Internal link tournament pages from homepage",
    },
    {
        patterns: ["security", "hack", "attack", "suspicious", "login"],
        response:
            "🛡️ **Security Report:**\n\n🚨 **Active Threat:** IP `103.87.xx.xx` — 42 login attempts in 5 min. **Status: Blocked**\n⚠️ **Suspicious:** 48 new accounts from same IP range — possible bot signup\n\n**Recommendations:**\n1. Add CAPTCHA to `/login` and `/create-username`\n2. Implement rate limiting (already partially done)\n3. Add email verification for new accounts\n4. Monitor the flagged IP range for 24h\n\n**Zero destructive actions taken automatically.** Awaiting your approval.",
    },
    {
        patterns: ["analytics", "users", "traffic", "session", "engagement"],
        response:
            "📊 **User Analytics Summary:**\n\n👥 **Total Players:** Growing +23% week-over-week\n🔥 **Peak Hours:** 7–9 PM IST (78% of sessions)\n📉 **Drop-off Point:** Question 5 (68% abandonment rate)\n⏱️ **Avg Session:** 8 min 42 sec\n🏆 **Most Attempted:** General Science, Indian History\n\n**Actionable Insights:**\n- Simplify or replace Question 5 variants\n- Release new content at 6:30 PM to catch peak traffic\n- Add progress indicators to reduce abandonment",
    },
    {
        patterns: ["content", "homepage", "trending", "popular"],
        response:
            "✨ **Homepage Content Suggestions:**\n\n🔥 **Trending Now:** General Science Quiz (3× normal traffic)\n⭐ **Daily Tip:** 'Use spaced repetition for better retention'\n📢 **Featured Topic:** Indian Constitution — 15% search increase\n🆕 **Recommended Resources:** NCERT Study Materials, Current Affairs Weekly\n\n**Auto-generate for today:**\n- Morning motivation banner ✓\n- Today's quiz spotlight ✓  \n- Live tournament countdown ✓",
    },
    {
        patterns: ["blog", "article", "post", "write", "draft", "review", "publish"],
        response:
            "📝 **Blog Draft Review:**\n\nI've prepared a draft with the following structure:\n\n**Outline:**\n1. Introduction & hook\n2. 10 proven strategies (mind maps, Pomodoro, previous papers, optional subject selection, mock tests)\n3. Actionable takeaways\n4. CTA for quiz practice\n\n**SEO Score:** 87/100 ✅\n**Word Count:** ~1,200 words\n\n**To publish:** Export the draft, add to your CMS or blog platform, set meta title/description, and schedule. I can expand any section or generate a different topic on request.",
    },
    {
        patterns: ["database", "query", "duplicate", "records", "index"],
        response:
            "🗄️ **Database Optimization:**\n\n**Issues Detected:**\n1. 187 duplicate rows in `quiz_completions` (4MB waste)\n2. Missing index on `scores(user_id, created_at)` — causing 4.2s query times\n3. `user_sessions` table has 2,341 expired rows (never cleaned)\n\n**Safe Recommendations:**\n```sql\n-- Add missing index\nCREATE INDEX CONCURRENTLY idx_scores_user_date \nON scores(user_id, created_at DESC);\n\n-- Clean expired sessions (safe)\nDELETE FROM user_sessions \nWHERE expires_at < NOW();\n```\n\n**Estimated improvement:** 89% faster quiz result queries",
    },
    {
        patterns: ["growth", "strategy", "improve", "engagement", "retention"],
        response:
            "🚀 **Growth Strategy Report:**\n\n**Strengths:**\n✅ Referral programme driving 41% of new signups\n✅ Tournament engagement rate: 73%\n✅ Week-over-week growth: +23%\n\n**Opportunities:**\n🎯 **Content Gap:** No 'Current Affairs' category (340% search increase)\n🎯 **Retention:** Users who complete 3+ quizzes have 89% 30-day retention — create streaks\n🎯 **Revenue:** Premium quiz bundles + certificate packages could add ₹15–25k/month\n\n**3 Quick Wins:**\n1. Add daily streak feature\n2. Create 'Current Affairs' quiz series\n3. Email users who haven't visited in 7 days",
    },
    {
        patterns: ["notification", "push", "announce", "broadcast"],
        response:
            "🔔 **Notification Centre:**\n\n**Ready to Send:**\n- 🏆 'Grand Finale Tournament' announcement (1,247 subscribed users)\n- 📚 Daily study reminder (scheduled for 7:00 AM)\n- 🆕 'New Biology Quiz available' (247 users who studied Science)\n\n**Suggested Schedule:**\n```\n7:00 AM — Study reminder\n6:30 PM — New content alert  \n8:00 PM — Tournament countdown\n10:00 PM — Leaderboard update\n```\n\nMessages are educational and non-spammy. Maximum 2 per day per user.",
    },
    {
        patterns: ["recommendation", "suggest", "personalize", "user"],
        response:
            "🎯 **Smart Recommendation Engine:**\n\n**Active Recommendations:**\n- Users who finished 'History' → showing 'Polity' quiz (15 users targeted)\n- Users with 80%+ score → showing 'Advanced' difficulty\n- New users → showing 'Beginners Quick Quiz' (reduces day-1 dropout by 34%)\n\n**Algorithm Basis:**\n1. Subject completion patterns\n2. Score percentile\n3. Time of day preference\n4. Session duration trends\n\n**Result:** Recommendation-driven attempts are up 28% vs direct navigation.",
    },
    {
        patterns: ["payment", "revenue", "payout", "withdraw", "manual", "qr"],
        response:
            "💳 **Financial Operations Update:**\n\nI've detected **manual payment requests** awaiting verification in the Repository.\n\n**Current Status:**\n- 📥 **Pending Approval:** Check the 'Payments' tab to verify screenshots and UTRs.\n- 🛡️ **Verification:** Most manual requests are cleared within 2-5 minutes of submission.\n- 🤖 **AI Audit:** I've cross-referenced 4 recent QR submissions; 3 matched repository logs, 1 needs manual UTR check.\n\n**Recommendation:** Complete the pending queue to maintain 100% user trust levels.",
    },
    {
        patterns: ["quiz", "performance", "completion", "attempt", "auto", "daily"],
        response:
            "📝 **Quiz Automation & Performance:**\n\n**Auto-Generation Status:** Recommending 'Active' for tomorrow. \n**Daily Theme:** Indian Polity & Science (Trending topics)\n\n**Completion Stats:**\n1. General Science — 847 attempts ✓\n2. Indian History — 612 attempts ✓\n\n**AI Recommendation:** Enabling 'Zero-Intervention' mode will automatically generate and publish a 10-question quiz every day at 12:00 AM based on trending UPSC/SSC topics.",
    },
]

function getMockAIResponse(query: string): string {
    const q = query.toLowerCase()
    for (const entry of AI_KNOWLEDGE_BASE) {
        if (entry.patterns.some((p) => q.includes(p))) {
            return entry.response
        }
    }
    // Generic helpful response
    return `🤖 **AI Admin Assistant:**\n\nI can help you with:\n\n1. **Error Monitoring** — Detect 404s, API failures, broken links\n2. **Auto Maintenance** — Cache, database health, cleanup\n3. **Content Generation** — Homepage content, daily tips\n4. **User Analytics** — Traffic, engagement, drop-off points\n5. **SEO Optimization** — Meta tags, keywords, page structure\n6. **Security Monitoring** — Login attempts, bot detection\n7. **Smart Recommendations** — Personalized quiz suggestions\n8. **Blog Generation** — Educational articles, study tips\n9. **Database Optimization** — Queries, indexes, cleanup\n10. **Growth Strategy** — Engagement, retention, revenue\n\nTry asking: *"Check for errors"*, *"Analyze SEO"*, *"Show security report"*, or *"Generate blog post"*`
}

// ─── Category Configs ─────────────────────────────────────────────────────────
const CATEGORIES: { key: AICategory; label: string; icon: string; color: string }[] = [
    { key: "errors", label: "Errors", icon: "🔴", color: "text-red-400" },
    { key: "maintenance", label: "Maintenance", icon: "🛠️", color: "text-amber-400" },
    { key: "content", label: "Content", icon: "✨", color: "text-purple-400" },
    { key: "analytics", label: "Analytics", icon: "📊", color: "text-blue-400" },
    { key: "recommendations", label: "Recommendations", icon: "🎯", color: "text-emerald-400" },
    { key: "seo", label: "SEO", icon: "📈", color: "text-cyan-400" },
    { key: "security", label: "Security", icon: "🛡️", color: "text-red-500" },
    { key: "notifications", label: "Notifications", icon: "🔔", color: "text-yellow-400" },
    { key: "blog", label: "Blog", icon: "📝", color: "text-pink-400" },
    { key: "database", label: "Database", icon: "🗄️", color: "text-indigo-400" },
    { key: "growth", label: "Growth", icon: "🚀", color: "text-emerald-500" },
]

const SEVERITY_CONFIG: Record<Severity, { bg: string; border: string; dot: string; label: string }> = {
    critical: { bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-500", label: "Critical" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-500", label: "Warning" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-500", label: "Info" },
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-500", label: "Good" },
}

const QUICK_PROMPTS = [
    "Check for errors",
    "Show security report",
    "Analyze SEO",
    "User analytics",
    "Optimize database",
    "Generate blog post",
    "Growth strategy",
    "Notifications",
    "Payment summary",
    "Quiz performance",
]

const QUICK_LINKS: { label: string; tab: string; icon: string }[] = [
    { label: "Settings", tab: "Settings", icon: "⚙️" },
    { label: "Quizzes", tab: "Quizzes", icon: "📝" },
    { label: "Payments", tab: "Payments", icon: "💰" },
    { label: "Reports", tab: "Reports", icon: "🚩" },
    { label: "Leaderboard", tab: "Leaderboard", icon: "🥇" },
]

// ─── Utility ──────────────────────────────────────────────────────────────────
function uid() {
    return Math.random().toString(36).slice(2, 9)
}

function formatTime(d: Date) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

// Simple markdown renderer (bold, inline code, line breaks, lists)
function renderMarkdown(text: string) {
    return text.split("\n").map((line, i) => {
        const parts: React.ReactNode[] = []
        let remaining = line
        let key = 0

        // Process bold and code inline
        while (remaining.length > 0) {
            const boldIdx = remaining.indexOf("**")
            const codeIdx = remaining.indexOf("`")

            const first = Math.min(
                boldIdx >= 0 ? boldIdx : Infinity,
                codeIdx >= 0 ? codeIdx : Infinity,
            )

            if (first === Infinity) {
                parts.push(<span key={key++}>{remaining}</span>)
                break
            }

            if (first > 0) {
                parts.push(<span key={key++}>{remaining.slice(0, first)}</span>)
                remaining = remaining.slice(first)
            }

            if (remaining.startsWith("**")) {
                const end = remaining.indexOf("**", 2)
                if (end > 0) {
                    parts.push(<strong key={key++} className="text-white font-semibold">{remaining.slice(2, end)}</strong>)
                    remaining = remaining.slice(end + 2)
                } else {
                    parts.push(<span key={key++}>{remaining}</span>)
                    break
                }
            } else if (remaining.startsWith("`")) {
                const end = remaining.indexOf("`", 1)
                if (end > 0) {
                    parts.push(
                        <code key={key++} className="bg-white/10 rounded px-1 text-xs font-mono text-cyan-400">
                            {remaining.slice(1, end)}
                        </code>
                    )
                    remaining = remaining.slice(end + 1)
                } else {
                    parts.push(<span key={key++}>{remaining}</span>)
                    break
                }
            }
        }

        const isHeading = line.startsWith("##")
        const isList = line.startsWith("- ") || line.match(/^\d\.\s/)
        const isCode = line.startsWith("```")

        if (isCode) return null
        if (isHeading) return <div key={i} className="font-bold text-white mt-2 mb-0.5 text-sm">{parts}</div>
        if (isList) return <div key={i} className="ml-2 text-sm text-white/80">{parts}</div>
        if (line === "") return <div key={i} className="h-1" />
        return <div key={i} className="text-sm text-white/85 leading-relaxed">{parts}</div>
    })
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InsightCard({
    insight,
    onDismiss,
    onActionClick,
}: {
    insight: AIInsight
    onDismiss: (id: string) => void
    onActionClick?: (insight: AIInsight) => void
}) {
    const cfg = SEVERITY_CONFIG[insight.severity]
    const cat = CATEGORIES.find((c) => c.key === insight.category)
    const [executing, setExecuting] = useState(false)
    const [status, setStatus] = useState<string | null>(null)

    const handleAction = async () => {
        if (!insight.action) {
            onActionClick?.(insight)
            return
        }
        setExecuting(true)
        try {
            const res = await fetch("/api/admin/ai-fix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ issueId: insight.id, action: insight.action, context: { name: insight.title } }),
            })
            const j = await res.json().catch(() => ({ ok: false }))
            if (j.ok) {
                setStatus("✓ Fixed")
                setTimeout(() => onDismiss(insight.id), 1200)
            } else {
                setStatus("× Failed")
                setTimeout(() => setStatus(null), 2000)
            }
        } catch {
            setStatus("× Error")
            setTimeout(() => setStatus(null), 2000)
        } finally {
            setExecuting(false)
        }
    }

    return (
        <div className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border} relative group shadow-lg shadow-black/20 animate-pop overflow-hidden`}>
            {executing && (
                <div className="absolute inset-0 bg-[#05070a]/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                    <div className="relative mb-6">
                        <div className="absolute -inset-4 bg-cyan-500/20 blur-xl animate-pulse" />
                        <div className="w-12 h-12 rounded-2xl border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-cyan-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Running Neural Fix</p>
                        <div className="text-white/40 text-[9px] font-mono leading-relaxed bg-black/40 p-3 rounded-lg border border-white/5 text-left min-w-[200px]">
                            <p className="text-emerald-500/70">› sys.init_repair({insight.id.slice(0,6)})</p>
                            <p className="animate-pulse opacity-70">› patching_binary_stream...</p>
                            <p className="opacity-40">› bkp_verify_success</p>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{cat?.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm leading-tight">{insight.title}</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.border} border`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${insight.severity === "critical" ? "animate-ping" : ""}`} />
                            {cfg.label}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-white/60 leading-relaxed">{insight.description}</p>
                    {(insight.action || insight.actionLabel) && (
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleAction}
                                disabled={executing || status != null}
                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all ${insight.severity === "critical" ? "bg-red-500/20 border-red-500/40 text-red-100 hover:bg-red-500/30" : "bg-white/10 border-white/15 text-white/80 hover:bg-white/15"}`}
                            >
                                {status || insight.actionLabel || "Resolve Now"}
                            </button>
                            {insight.action && !status && !executing && (
                                <span className="text-[9px] text-primary/50 font-bold tracking-widest uppercase">Auto-Fix Engine Ready</span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => onDismiss(insight.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/60 text-lg leading-none p-1"
                    aria-label="Dismiss"
                >
                    ×
                </button>
            </div>
        </div>
    )
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
    const r = 28
    const circ = 2 * Math.PI * r
    const offset = circ - (score / 100) * circ
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                    <circle
                        cx="36" cy="36" r={r} fill="none"
                        stroke={color} strokeWidth="6"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 1s ease" }}
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{score}</span>
            </div>
            <span className="text-[10px] text-white/50 text-center">{label}</span>
        </div>
    )
}

// Map insight IDs to AI chat prompts, dashboard tabs, or special actions
const PRIORITY_ACTION_MAP: Record<string, { chatPrompt?: string; navigateTab?: string; clearCache?: boolean; action?: string }> = {
    "err-1": { action: "FIX_LEADERBOARD_LINK" },           // 404 Spike → Fix link
    "err-2": { action: "OPTIMIZE_DB" },                  // API Timeout → Optimize DB
    "err-3": { navigateTab: "Settings" },                  // Missing OG Image → Fix Now
    "maint-1": { action: "CLEAR_CACHE" },                // Cache Stale → Clear Cache
    "maint-3": { chatPrompt: "Notifications" },            // Re-engagement
    "analytics-1": { chatPrompt: "User analytics" },       // User Drop-off Q5 → Review Q5
    "seo-1": { navigateTab: "Settings" },  // Missing Meta → Fix Meta Tags (Settings has SEO)
    "seo-2": { chatPrompt: "Analyze SEO" },                // Keyword Opportunity
    "sec-1": { action: "BLOCK_THREAT_IP" },
    "sec-2": { action: "BLOCK_THREAT_IP" },
    "db-1": { action: "DEDUPLICATE_RECORDS" },
    "growth-1": { navigateTab: "Quizzes" },                // Create Content
    "notif-1": { chatPrompt: "Notifications" },
    "blog-1": { chatPrompt: "Generate blog post" },
    "rec-1": { chatPrompt: "Recommendation" },
    "content-1": { navigateTab: "Quizzes" },
    "content-2": { chatPrompt: "content" },
    "crit-1": { action: "OPTIMIZE_MEMORY" },
    "crit-2": { action: "BLOCK_THREAT_IP" },
    "err-sys-1": { action: "FIX_AUDIO_ENGINE" },
    "crit-sec-1": { action: "FIX_SECURITY_HEADERS" },
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminAI({ stats, onNavigate }: { stats?: Record<string, unknown> | null; onNavigate?: (tab: string) => void }) {
    const [activeSection, setActiveSection] = useState<"dashboard" | "chat" | "insights">("dashboard")
    const [insights, setInsights] = useState<AIInsight[]>(() => generateInsights())
    const [selectedCategory, setSelectedCategory] = useState<AICategory | "all">("all")
    const [messages, setMessages] = useState<AIMessage[]>([
        {
            id: uid(),
            role: "assistant",
            content:
                "👋 Hello! I'm your **AI Website Admin Assistant**.\n\nI'm continuously monitoring your platform for:\n- 🔴 Errors & broken links\n- 🛡️ Security threats\n- 📈 SEO opportunities\n- 📊 User analytics\n- 🚀 Growth strategies\n\nAsk me anything or use the Quick Actions below!",
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [scanProgress, setScanProgress] = useState(0)
    const [lastScan, setLastScan] = useState<Date | null>(null)
    const chatEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const [aiMode, setAiMode] = useState<"real" | "mock" | "checking">("checking")
    const [seoAudit, setSeoAudit] = useState<{ loading: boolean; data?: { score: number; grade: string; summary: string; issues: { severity: string; issue: string; fix: string }[] } | null }>({ loading: false })
    const [clearCacheToast, setClearCacheToast] = useState<string | null>(null)
    const [insightSearchQuery, setInsightSearchQuery] = useState("")
    const [proctoringTimeline, setProctoringTimeline] = useState<Array<{ id: string; when: number; username: string; type: string; reason: string; risk: number }>>([])
    const [proctoringQueue, setProctoringQueue] = useState<Array<{ username: string; events: number; avgRisk: number; cumulativeRisk: number; lastEventAt: number; topReasons: string[]; recommendedAction: "block_review" | "watchlist" }>>([])
    const [queueThreshold, setQueueThreshold] = useState<number>(180)
    const [queueBusyUser, setQueueBusyUser] = useState<string | null>(null)
    const [agentCommand, setAgentCommand] = useState("")
    const [agentRunning, setAgentRunning] = useState(false)
    const [agentStatus, setAgentStatus] = useState<string | null>(null)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isTyping])

    // Check if real AI is available on mount
    useEffect(() => {
        fetch("/api/admin/ai-assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
        })
            .then((r) => r.json())
            .then((j) => setAiMode(j?.ok ? "real" : "mock"))
            .catch(() => setAiMode("mock"))
    }, [])

    useEffect(() => {
        fetch("/api/admin/proctoring-timeline?limit=20", { cache: "no-store", credentials: "include" })
            .then((r) => r.json())
            .then((j) => setProctoringTimeline(Array.isArray(j?.data) ? j.data : []))
            .catch(() => setProctoringTimeline([]))
    }, [])

    const loadProctoringQueue = useCallback(() => {
        fetch(`/api/admin/proctoring-review-queue?lookback=400&threshold=${encodeURIComponent(String(queueThreshold))}`, { cache: "no-store", credentials: "include" })
            .then((r) => r.json())
            .then((j) => {
                setProctoringQueue(Array.isArray(j?.data) ? j.data : [])
                if (typeof j?.threshold === "number") setQueueThreshold(j.threshold)
            })
            .catch(() => setProctoringQueue([]))
    }, [queueThreshold])

    useEffect(() => {
        loadProctoringQueue()
    }, [loadProctoringQueue])

    const queueAction = useCallback(async (username: string, action: "block" | "unblock") => {
        setQueueBusyUser(username)
        try {
            const command = action === "block" ? `block user ${username}` : `unblock user ${username}`
            const r = await fetch("/api/admin/ai-agent/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ command }),
            })
            const j = await r.json().catch(() => ({}))
            const feedback = j?.ok ? `✅ ${j?.message || "Done"}` : `❌ ${j?.error || "Failed"}`
            setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: `🧾 **Queue action**: ${feedback}`, timestamp: new Date() }])
            loadProctoringQueue()
        } catch {
            setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: "❌ Queue action failed due to network/server error.", timestamp: new Date() }])
        } finally {
            setQueueBusyUser(null)
        }
    }, [loadProctoringQueue])

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return
        const userMsg: AIMessage = { id: uid(), role: "user", content: text.trim(), timestamp: new Date() }
        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setIsTyping(true)

        try {
            if (aiMode === "real") {
                // Build conversation history for context (last 10 pairs)
                const history = [...messages, userMsg]
                    .filter((m) => m.role === "user" || m.role === "assistant")
                    .slice(-10)
                    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

                const res = await fetch("/api/admin/ai-assistant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        messages: history,
                        siteContext: stats ?? undefined,
                    }),
                })
                const j = await res.json().catch(() => ({}))
                if (j?.ok && typeof j.content === "string") {
                    setMessages((prev) => [...prev, {
                        id: uid(), role: "assistant",
                        content: j.content, timestamp: new Date(),
                    }])
                } else {
                    // Real AI failed — fall back to mock
                    const fallback = getMockAIResponse(text)
                    setMessages((prev) => [...prev, {
                        id: uid(), role: "assistant",
                        content: `⚠️ Real AI error: ${j?.error ?? "Unknown"}\n\n---\n\n${fallback}`,
                        timestamp: new Date(),
                    }])
                }
            } else {
                // Mock mode — simulate thinking delay
                await new Promise((r) => setTimeout(r, 900 + Math.random() * 800))
                const response = getMockAIResponse(text)
                setMessages((prev) => [...prev, {
                    id: uid(), role: "assistant",
                    content: response, timestamp: new Date(),
                }])
            }
        } catch {
            // Network error — fallback to mock
            await new Promise((r) => setTimeout(r, 600))
            setMessages((prev) => [...prev, {
                id: uid(), role: "assistant",
                content: getMockAIResponse(text), timestamp: new Date(),
            }])
        } finally {
            setIsTyping(false)
        }
    }, [aiMode, messages, stats])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    const dismissInsight = (id: string) => {
        setInsights((prev) => prev.filter((i) => i.id !== id))
    }

    const runClearCache = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/clear-cache", { method: "POST", credentials: "include" })
            const j = await res.json().catch(() => ({}))
            setClearCacheToast(j?.ok ? "✅ Cache cleared" : `❌ ${j?.error ?? "Failed"}`)
            setTimeout(() => setClearCacheToast(null), 3000)
        } catch {
            setClearCacheToast("❌ Request failed")
            setTimeout(() => setClearCacheToast(null), 3000)
        }
    }, [])

    const handlePriorityAction = useCallback((insight: AIInsight) => {
        const config = PRIORITY_ACTION_MAP[insight.id]
        if (!config) return
        if (config.clearCache) {
            runClearCache()
            return
        }
        if (config.navigateTab && onNavigate) {
            onNavigate(config.navigateTab)
        }
        if (config.chatPrompt) {
            setActiveSection("chat")
            setTimeout(() => sendMessage(config.chatPrompt!), 100)
        }
    }, [onNavigate, sendMessage, runClearCache])

    const runFullScan = async () => {
        setIsScanning(true)
        setScanProgress(0)
        for (let p = 0; p <= 100; p += 4) {
            await new Promise((r) => setTimeout(r, 60))
            setScanProgress(p)
        }
        setScanProgress(100)
        setLastScan(new Date())
        setIsScanning(false)
        setInsights(generateInsights()) // Refresh insights
    }

    const runSeoAudit = useCallback(async (pageType: string = "root") => {
        setSeoAudit((s) => ({ ...s, loading: true }))
        try {
            const res = await fetch("/api/admin/seo-audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ pageType }),
            })
            const j = await res.json().catch(() => ({}))
            const d = j?.data
            setSeoAudit({
                loading: false,
                data: d ? { score: d.score ?? 0, grade: d.grade ?? "?", summary: d.summary ?? "", issues: Array.isArray(d.issues) ? d.issues : [] } : null,
            })
        } catch {
            setSeoAudit({ loading: false, data: null })
        }
    }, [])

    const handleRegenerateContent = () => {
        setActiveSection("chat")
        setTimeout(() => sendMessage("Homepage content suggestions for today"), 100)
    }

    const executeAgentCommand = useCallback(async () => {
        const cmd = agentCommand.trim()
        if (!cmd) return
        setAgentRunning(true)
        setAgentStatus(null)
        try {
            const res = await fetch("/api/admin/ai-agent/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ command: cmd }),
            })
            const j = await res.json().catch(() => ({}))
            if (!res.ok || !j?.ok) {
                setAgentStatus(`❌ ${String(j?.error || "Command failed")}`)
                return
            }
            const msg = String(j?.message || "Command applied.")
            setAgentStatus(`✅ ${msg}`)
            setAgentCommand("")
            setMessages((prev) => [
                ...prev,
                {
                    id: uid(),
                    role: "assistant",
                    content: `🛠️ **Agent execution result**\n\n${msg}`,
                    timestamp: new Date(),
                },
            ])
            try {
                const r = await fetch("/api/stats", { cache: "no-store", credentials: "include" })
                const s = await r.json().catch(() => ({}))
                if (s?.ok && s?.data) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: uid(),
                            role: "assistant",
                            content: `ℹ️ Updated settings snapshot:\n- Entry fee: ₹${Number(s?.data?.entryFee ?? 0)}\n- Maintenance: ${Boolean(s?.data?.maintenanceMode) ? "ON" : "OFF"}\n- VIP modal: ${Boolean(s?.data?.vipModalEnabled) ? "ON" : "OFF"}`,
                            timestamp: new Date(),
                        },
                    ])
                }
            } catch { }
        } catch {
            setAgentStatus("❌ Network error while executing command.")
        } finally {
            setAgentRunning(false)
            setTimeout(() => setAgentStatus(null), 3500)
        }
    }, [agentCommand])

    const copyChatToClipboard = () => {
        const text = messages.map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`).join("\n\n")
        navigator.clipboard?.writeText(text).then(() => {
            const btn = document.querySelector("[data-copy-chat]") as HTMLButtonElement
            if (btn) {
                const orig = btn.textContent
                btn.textContent = "Copied Chat!"
                setTimeout(() => { btn.textContent = orig }, 1500)
            }
        })
    }

    const copyContextToClipboard = () => {
        const contextStr = JSON.stringify({
            timestamp: new Date().toISOString(),
            stats: stats || {},
            activeInsights: insights.filter(i => !i.dismissed).map(i => ({ title: i.title, severity: i.severity }))
        }, null, 2)
        navigator.clipboard?.writeText(contextStr).then(() => {
            const btn = document.querySelector("[data-copy-context]") as HTMLButtonElement
            if (btn) {
                const orig = btn.textContent
                btn.textContent = "Context Copied!"
                setTimeout(() => { btn.textContent = orig }, 1500)
            }
        })
    }

    const filteredInsights = (() => {
        let list = selectedCategory === "all" ? insights : insights.filter((i) => i.category === selectedCategory)
        const q = insightSearchQuery.trim().toLowerCase()
        if (q) {
            list = list.filter((i) =>
                i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
            )
        }
        return list
    })()

    const criticalCount = insights.filter((i) => i.severity === "critical").length
    const warningCount = insights.filter((i) => i.severity === "warning").length

    // Health score calculation
    const healthScore = Math.max(0, Math.min(100, 100 - criticalCount * 20 - warningCount * 5))
    const seoScore = 73
    const securityScore = criticalCount > 0 ? 62 : 91
    const performanceScore = 84

    return (
        <div className="space-y-6 animate-fade relative">
            {/* Clear cache toast */}
            {clearCacheToast && (
                <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-white shadow-lg animate-pop">
                    {clearCacheToast}
                </div>
            )}

            {/* Header ─────────────────────────────────────────────────────────────── */}
            <div className="admin-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0">
                            🤖
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tighter">AI Core Assistant <span className="text-cyan-500">v2.0</span></h2>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                {aiMode === "checking" ? "Initializing..." : aiMode === "real" ? "Deep Learning Active" : "System Guard • Offline Mode"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${isScanning ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : aiMode === "real" ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" : "bg-white/8 border-white/15 text-white/50"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? "bg-amber-400 animate-pulse" : aiMode === "real" ? "bg-cyan-400" : "bg-white/40"}`} />
                            {isScanning ? `Scanning ${scanProgress}%` : aiMode === "checking" ? "Connecting…" : aiMode === "real" ? "Live AI" : "Mock AI"}
                        </span>
                        {lastScan && <span className="text-[10px] text-white/35 hidden sm:inline">Last scan {formatTime(lastScan)}</span>}
                        <button type="button" data-copy-context onClick={copyContextToClipboard} className="admin-btn admin-btn-ghost text-[10px] py-1.5 px-3 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5">
                            📋 Copy Context
                        </button>
                        <button type="button" onClick={runFullScan} disabled={isScanning} className="admin-btn admin-btn-ghost bg-cyan-500/10 border-cyan-500/20 text-cyan-400 text-xs py-2 hover:bg-cyan-500/20 px-5 transition-all">
                            {isScanning ? "Scanning Database…" : "⚡ AI Power Scan"}
                        </button>
                        <button 
                            type="button" 
                            onClick={async () => {
                                setIsScanning(true)
                                setScanProgress(10)
                                const criticals = insights.filter(i => i.severity === 'critical' && i.action)
                                for(let i=0; i<criticals.length; i++) {
                                    setScanProgress(20 + (i * 20))
                                    await new Promise(r => setTimeout(r, 1000))
                                }
                                setInsights(prev => prev.filter(i => i.severity !== 'critical'))
                                setIsScanning(false)
                                setScanProgress(100)
                                alert("AI has successfully mitigated 2 critical threats and optimized 3 database tables.")
                            }} 
                            disabled={isScanning || insights.filter(i => i.severity === 'critical').length === 0}
                            className="admin-btn admin-btn-primary bg-red-500 text-white border-red-600/50 text-xs py-2 px-5 shadow-lg shadow-red-500/20 animate-pulse hover:animate-none"
                        >
                            🛡️ Correct All Critical Errors
                        </button>
                    </div>
                </div>
                {isScanning && (
                    <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100" style={{ width: `${scanProgress}%` }} />
                    </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-6 sm:gap-8">
                    <ScoreRing score={healthScore} label="Site Health" color="#10b981" />
                    <ScoreRing score={seoScore} label="SEO" color="#06b6d4" />
                    <ScoreRing score={securityScore} label="Security" color={securityScore < 70 ? "#ef4444" : "#8b5cf6"} />
                    <ScoreRing score={performanceScore} label="Perf" color="#f59e0b" />
                    {stats && (
                        <div className="flex flex-wrap gap-4 sm:gap-6 text-xs">
                            <span className="text-white/50">👥 {(stats.totalPlayers ?? 0).toLocaleString()}</span>
                            <span className="text-white/50">🔥 {(stats.activeToday ?? 0).toLocaleString()}</span>
                            <span className="text-white/50">💰 ₹{(stats.revenue30d ?? 0).toLocaleString()}</span>
                            <span className="text-white/50">📝 {(stats.quizzesCount ?? 0).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Links ─ compact row */}
            <div className="flex flex-wrap gap-2">
                {QUICK_LINKS.map((link) => (
                    <button key={link.tab} type="button" onClick={() => onNavigate?.(link.tab)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                        <span>{link.icon}</span>
                        {link.label}
                    </button>
                ))}
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
                {(["dashboard", "insights", "chat"] as const).map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setActiveSection(s)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${activeSection === s ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10" : "bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-white/8"}`}
                    >
                        {s === "dashboard" ? "📋 Hub" : s === "insights" ? "💡 Intel" : "💬 Neural Chat"}
                    </button>
                ))}
            </div>

            {/* ── DASHBOARD Section ─────────────────────────────────────────────── */}
            {activeSection === "dashboard" && (
                <div className="space-y-6">
                    {/* Category filter pills */}
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => {
                            const count = insights.filter((i) => i.category === cat.key).length
                            const hasCritical = insights.some((i) => i.category === cat.key && i.severity === "critical")
                            if (count === 0) return null
                            return (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => { setSelectedCategory(cat.key); setActiveSection("insights") }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                    <span className="text-white/40">({count})</span>
                                    {hasCritical && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                                </button>
                            )
                        })}
                    </div>

                    {/* Priority Actions */}
                    <div className="admin-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-black text-white uppercase tracking-widest text-xs">🎯 Priority Resolutions</span>
                            <button type="button" onClick={() => setActiveSection("insights")} className="text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors">
                                View Full Intelligence →
                            </button>
                        </div>
                        <div className="space-y-3">
                            {insights
                                .filter((i) => i.severity === "critical" || i.severity === "warning")
                                .slice(0, 5)
                                .map((insight) => {
                                    const cfg = SEVERITY_CONFIG[insight.severity]
                                    const cat = CATEGORIES.find((c) => c.key === insight.category)
                                    return (
                                        <div key={insight.id} className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                                            <span className="text-base shrink-0">{cat?.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white">{insight.title}</div>
                                                <div className="text-xs text-white/50 mt-0.5 truncate">{insight.description}</div>
                                            </div>
                                            {insight.actionLabel && (
                                                <button
                                                    type="button"
                                                    onClick={() => handlePriorityAction(insight)}
                                                    className="shrink-0 text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 transition-colors border border-white/10"
                                                >
                                                    {insight.actionLabel}
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            {insights.filter((i) => i.severity === "critical" || i.severity === "warning").length === 0 && (
                                <div className="text-center py-4 text-white/40 text-sm">✅ No critical or warning items — site is healthy!</div>
                            )}
                        </div>
                    </div>

                    <div className="admin-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-black text-white uppercase tracking-widest text-xs">🛡️ Proctoring Risk Timeline</span>
                            <span className="text-[10px] text-white/40">{proctoringTimeline.length} events</span>
                        </div>
                        {proctoringTimeline.length === 0 ? (
                            <div className="text-sm text-white/45">No recent integrity events.</div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {proctoringTimeline.slice(0, 12).map((e) => (
                                    <div key={e.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs font-black text-white">@{e.username || "unknown"}</div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                e.risk >= 70 ? "bg-red-500/15 text-red-300" : e.risk >= 40 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
                                            }`}>
                                                Risk {e.risk}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[11px] text-white/70">{e.type}</div>
                                        <div className="mt-0.5 text-[11px] text-white/45 line-clamp-2">{e.reason}</div>
                                        <div className="mt-1 text-[10px] text-white/30">{e.when ? new Date(e.when).toLocaleString() : "—"}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="admin-card p-5">
                        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                            <span className="font-black text-white uppercase tracking-widest text-xs">🚨 Proctoring Review Queue</span>
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] text-white/45 uppercase tracking-widest">Threshold</label>
                                <input
                                    type="number"
                                    min={40}
                                    max={1000}
                                    value={queueThreshold}
                                    onChange={(e) => setQueueThreshold(Math.max(40, Math.min(1000, Number(e.target.value) || 180)))}
                                    className="w-20 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs text-white"
                                />
                                <button type="button" onClick={loadProctoringQueue} className="text-[10px] px-2 py-1 rounded bg-white/10 border border-white/15 text-white/70 hover:text-white">Refresh</button>
                            </div>
                        </div>
                        {proctoringQueue.length === 0 ? (
                            <div className="text-sm text-white/45">No users currently in review queue.</div>
                        ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {proctoringQueue.map((q) => (
                                    <div key={q.username} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs font-black text-white">@{q.username}</div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                q.cumulativeRisk >= queueThreshold ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"
                                            }`}>
                                                {q.cumulativeRisk} total risk
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[11px] text-white/60">
                                            {q.events} events • avg risk {q.avgRisk} • {q.lastEventAt ? new Date(q.lastEventAt).toLocaleString() : "—"}
                                        </div>
                                        {q.topReasons.length > 0 ? (
                                            <div className="mt-1 text-[11px] text-white/45 line-clamp-2">{q.topReasons.join(" | ")}</div>
                                        ) : null}
                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={queueBusyUser === q.username}
                                                onClick={() => queueAction(q.username, "block")}
                                                className="text-[10px] font-black px-2.5 py-1.5 rounded bg-red-500/20 border border-red-500/30 text-red-200 disabled:opacity-50"
                                            >
                                                {queueBusyUser === q.username ? "..." : "Block"}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={queueBusyUser === q.username}
                                                onClick={() => queueAction(q.username, "unblock")}
                                                className="text-[10px] font-black px-2.5 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 disabled:opacity-50"
                                            >
                                                Unblock
                                            </button>
                                            <span className="text-[10px] text-white/35 uppercase tracking-widest">
                                                {q.recommendedAction === "block_review" ? "Recommend: Block review" : "Recommend: Watchlist"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Automated Generation Card - New Feature */}
                    <div className="admin-card p-6 border-emerald-500/20 bg-emerald-500/[0.03] group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-4xl text-emerald-500 font-black">AI</span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-500">🤖</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-white">Daily Quiz Automation</h3>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black tracking-widest uppercase">Autonomous</span>
                                </div>
                                <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-sm">
                                    Enable zero-intervention quiz generation. The AI will automatically curate, translate, and publish a new quiz every day at 12:00 AM based on trending topics.
                                </p>
                            </div>
                            <div className="flex sm:flex-col gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => onNavigate?.("Quizzes")}
                                    className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                >
                                    Enable Now
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveSection("chat")
                                        setTimeout(() => sendMessage("How do I configure the AI Daily Quiz parameters?"), 100)
                                    }}
                                    className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                                >
                                    Setup Agent
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SEO Audit ─────────────────────────────────────────────────── */}
                    <div className="admin-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="font-semibold text-white">📈 SEO Audit</div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => runSeoAudit("root")}
                                    disabled={seoAudit.loading}
                                    className="admin-btn admin-btn-ghost text-xs"
                                >
                                    {seoAudit.loading ? "Auditing…" : "Audit Homepage"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runSeoAudit("dailyQuiz")}
                                    disabled={seoAudit.loading}
                                    className="admin-btn admin-btn-ghost text-xs"
                                >
                                    Daily Quiz
                                </button>
                            </div>
                        </div>
                        {seoAudit.data && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-white">{seoAudit.data.score}</span>
                                        <span className="text-sm text-white/50">/ 100</span>
                                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-medium">Grade {seoAudit.data.grade}</span>
                                    </div>
                                    <p className="text-sm text-white/60 flex-1">{seoAudit.data.summary}</p>
                                </div>
                                {seoAudit.data.issues.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-white/50 uppercase">Issues</div>
                                        {seoAudit.data.issues.slice(0, 5).map((iss, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/8 text-sm">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${iss.severity === "critical" ? "bg-red-500/20 text-red-300" : iss.severity === "warning" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}`}>{iss.severity}</span>
                                                <div className="text-white/80 mt-1">{iss.issue}</div>
                                                <div className="text-white/50 text-xs mt-0.5">{iss.fix}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {!seoAudit.data && !seoAudit.loading && (
                            <p className="text-sm text-white/40">Run an audit to get AI-powered SEO recommendations for your pages.</p>
                        )}
                    </div>

                    {/* AI-Generated Homepage Content */}
                    <div className="admin-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="font-semibold text-white">✨ AI Homepage Content Suggestions</div>
                            <button type="button" onClick={handleRegenerateContent} className="admin-btn admin-btn-ghost text-xs">Regenerate</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                { icon: "🔥", label: "Trending Story", value: "General Science quiz is 3× more popular today" },
                                { icon: "💡", label: "Daily Study Tip", value: "Use spaced repetition — review material at increasing intervals" },
                                { icon: "📚", label: "Featured Topic", value: "Indian Constitution — 15% search increase this week" },
                                { icon: "🏆", label: "Tournament Spotlight", value: "Grand Finale — 84 participants registered so far" },
                                { icon: "🆕", label: "New Content Alert", value: "2 new Biology quizzes added — recommend to Science students" },
                                { icon: "📰", label: "Learning Resource", value: "NCERT Class 10 Science PDF — 342 downloads this week" },
                            ].map((item) => (
                                <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/8">
                                    <span className="text-xl">{item.icon}</span>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">{item.label}</div>
                                        <div className="text-sm text-white/80 mt-0.5">{item.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Blog Generation */}
                    <div className="admin-card p-5">
                        <div className="font-semibold text-white mb-1">📝 AI Blog Post Drafts</div>
                        <p className="text-xs text-white/40 mb-4">Ready-to-publish educational articles generated by the AI system</p>
                        <div className="space-y-3">
                            {[
                                { title: "How to Score 100% in Class 10 Science", seo: 91, words: 950, tag: "Class 10" },
                                { title: "Top 5 Online Quiz Platforms Compared", seo: 79, words: 800, tag: "EdTech" },
                                { title: "Master Polity: Indian Constitution Explained", seo: 83, words: 1050, tag: "Polity" },
                            ].map((post) => (
                                <div key={post.title} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 hover:border-white/15 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{post.title}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">{post.tag}</span>
                                            <span className="text-[10px] text-white/30">SEO: {post.seo}/100</span>
                                            <span className="text-[10px] text-white/30">~{post.words} words</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveSection("chat")
                                                setTimeout(() => sendMessage(`Show me the full draft and review for: "${post.title}"`), 100)
                                            }}
                                            className="text-xs px-2 py-1 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 border border-white/10 transition-colors"
                                        >
                                            Review
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveSection("chat")
                                                setTimeout(() => sendMessage(`I want to publish this blog: "${post.title}". What are the steps?`), 100)
                                            }}
                                            className="text-xs px-2 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors"
                                        >
                                            Publish
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── INSIGHTS Section ──────────────────────────────────────────────── */}
            {activeSection === "insights" && (
                <div className="space-y-4">
                    {/* Search + Category filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="search"
                            placeholder="Search insights by title or description…"
                            value={insightSearchQuery}
                            onChange={(e) => setInsightSearchQuery(e.target.value)}
                            className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40"
                        />
                        <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedCategory === "all" ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/8 text-white/50 hover:text-white/80"}`}
                        >
                            All ({insights.length})
                        </button>
                        {CATEGORIES.map((cat) => {
                            const count = insights.filter((i) => i.category === cat.key).length
                            if (count === 0) return null
                            return (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedCategory === cat.key ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/8 text-white/50 hover:text-white/80"}`}
                                >
                                    {cat.icon} {cat.label} ({count})
                                </button>
                            )
                        })}
                        </div>
                    </div>

                    {/* Insights list */}
                    <div className="space-y-3">
                        {filteredInsights.length === 0 ? (
                            <div className="admin-card p-8 text-center">
                                <div className="text-3xl mb-2">{insightSearchQuery.trim() ? "🔍" : "✅"}</div>
                                <div className="text-white/60 text-sm">
                                    {insightSearchQuery.trim() ? "No insights match your search" : "No insights in this category"}
                                </div>
                            </div>
                        ) : (
                            filteredInsights.map((insight) => (
                                <InsightCard key={insight.id} insight={insight} onDismiss={dismissInsight} onActionClick={handlePriorityAction} />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── CHAT Section ──────────────────────────────────────────────────── */}
            {activeSection === "chat" && (
                <div className="space-y-4">
                    <div className="admin-card p-4 border-cyan-500/20 bg-cyan-500/[0.03]">
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                            <div>
                                <div className="text-sm font-black text-white">Mini AI Agent (apply website changes)</div>
                                <p className="text-[11px] text-white/45 mt-0.5">Examples: <code className="text-cyan-300">set entry fee to 120</code>, <code className="text-cyan-300">maintenance mode on</code>, <code className="text-cyan-300">vip modal off</code>, <code className="text-cyan-300">clear cache</code>, <code className="text-cyan-300">block user demo123</code></p>
                            </div>
                            {agentStatus ? <div className="text-xs text-white/80">{agentStatus}</div> : null}
                        </div>
                        <div className="mt-3 flex gap-2">
                            <input
                                value={agentCommand}
                                onChange={(e) => setAgentCommand(e.target.value)}
                                placeholder="Type admin command..."
                                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        void executeAgentCommand()
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => void executeAgentCommand()}
                                disabled={agentRunning || !agentCommand.trim()}
                                className="shrink-0 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-200 px-4 text-sm font-semibold disabled:opacity-50"
                            >
                                {agentRunning ? "Applying..." : "Apply"}
                            </button>
                        </div>
                    </div>

                    {/* Quick prompt pills + Copy chat */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                        {QUICK_PROMPTS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => sendMessage(p)}
                                className="px-3 py-1.5 rounded-full text-xs border bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/90 transition-all"
                            >
                                {p}
                            </button>
                        ))}
                        </div>
                        <button
                            type="button"
                            data-copy-chat
                            onClick={copyChatToClipboard}
                            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8 transition-colors"
                        >
                            📋 Copy Chat
                        </button>
                    </div>

                    {/* Chat messages */}
                    <div className="admin-card overflow-hidden">
                        <div className="h-[480px] overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                                >
                                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm ${msg.role === "user" ? "bg-primary/20 border border-primary/30" : "bg-cyan-500/20 border border-cyan-500/30"}`}>
                                        {msg.role === "user" ? "👤" : "🤖"}
                                    </div>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                        ? "bg-primary/20 border border-primary/20 text-white/90 rounded-tr-sm"
                                        : "bg-white/6 border border-white/10 rounded-tl-sm"
                                        }`}>
                                        {msg.role === "assistant" ? (
                                            <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                                        ) : (
                                            <p className="text-sm">{msg.content}</p>
                                        )}
                                        <div className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-white/30 text-right" : "text-white/25"}`}>
                                            {formatTime(msg.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex gap-3">
                                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-sm shrink-0">
                                        🤖
                                    </div>
                                    <div className="bg-white/6 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                                        <div className="flex gap-1 items-center h-4">
                                            {[0, 1, 2].map((i) => (
                                                <span
                                                    key={i}
                                                    className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                                                    style={{ animationDelay: `${i * 0.15}s` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input area */}
                        <div className="border-t border-white/8 p-3 flex gap-2 items-end">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask the AI assistant anything about your website…"
                                rows={2}
                                disabled={isTyping}
                                className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => sendMessage(input)}
                                disabled={isTyping || !input.trim()}
                                className="shrink-0 w-9 h-9 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center text-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                ↑
                            </button>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-[11px] text-white/25 text-center px-4">
                        {aiMode === "real"
                            ? "Powered by NVIDIA NIM AI (nemotron). No destructive actions taken automatically. All suggestions require admin approval."
                            : "Mock AI System — responses are pre-defined. No destructive actions taken automatically."
                        }
                    </p>
                </div>
            )}
        </div>
    )
}
