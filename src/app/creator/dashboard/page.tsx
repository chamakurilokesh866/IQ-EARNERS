"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import logoPng from "@/app/prizes/icon.png"

export default function CreatorDashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState({
        wallet: 0,
        pendingWallet: 0,
        referrals: 0,
        pendingReferrals: 0,
        lastWithdraw: 0
    })

    useEffect(() => {
        const checkSession = async () => {
            try {
                const r = await fetch("/api/creator/session")
                const j = await r.json()
                if (j.ok && j.creator) {
                    setUser(j.creator)
                    // Fetch real stats
                    setStats({
                        wallet: j.creator.wallet || 0,
                        pendingWallet: 0, // In a real app, query a transactions table
                        referrals: j.creator.referrals || 0,
                        pendingReferrals: 0,
                        lastWithdraw: 0
                    })
                } else {
                    router.push("/creator-join")
                }
            } catch {
                router.push("/creator-join")
            } finally {
                setLoading(false)
            }
        }
        checkSession()
    }, [router])

    const handleLogout = async () => {
        await fetch("/api/creator/session", { method: "DELETE" })
        router.push("/intro")
    }

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center app-page-surface">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="mt-4 text-xs tracking-widest text-primary animate-pulse font-bold">LOADING CREATOR HUB</div>
            </div>
        </div>
    )

    const referralLink = `${window.location.protocol}//${window.location.host}/intro?ref=${user.handle}`

    return (
        <main className="min-h-screen app-page-surface font-sans text-white selection:bg-primary selection:text-black">
            {/* Sidebar - Desktop */}
            <div className="fixed top-0 left-0 h-screen w-20 sm:w-64 bg-navy-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col items-center sm:items-stretch py-8 z-50">
                <div className="px-6 flex items-center gap-3 mb-10 overflow-hidden">
                    <Image src={logoPng} alt="IQ" className="h-10 w-10 min-w-[40px] rounded-xl border border-white/10" />
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hidden sm:block italic" style={{ fontFamily: "Pacifico, cursive" }}>IQ Creator</span>
                </div>

                <div className="flex-1 px-4 space-y-2">
                    {[
                        { id: "overview", icon: "📊", label: "Overview" },
                        { id: "referrals", icon: "🤝", label: "Referrals" },
                        { id: "payments", icon: "💰", label: "Payments" },
                        { id: "analytics", icon: "📈", label: "Analytics" },
                        { id: "content", icon: "✨", label: "Content Hub" },
                        { id: "settings", icon: "⚙️", label: "Settings" }
                    ].map(item => (
                        <button key={item.id} className="w-full h-12 flex items-center px-4 rounded-xl hover:bg-white/5 hover:text-primary transition-all group overflow-hidden">
                            <span className="text-xl mr-4 group-hover:scale-125 transition-transform">{item.icon}</span>
                            <span className="text-sm font-medium hidden sm:block">{item.label}</span>
                        </button>
                    ))}
                </div>

                <div className="px-4 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="w-full h-12 flex items-center px-4 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all overflow-hidden"
                    >
                        <span className="text-xl mr-4">🚪</span>
                        <span className="text-sm font-bold hidden sm:block">Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="pl-20 sm:pl-64 min-h-screen">
                {/* Navbar */}
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-navy-900/20 backdrop-blur-md sticky top-0 z-40">
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold text-navy-400 uppercase tracking-widest hidden sm:block">Verified Creator Dashboard</h2>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-semibold text-emerald-400">Live Partner Status</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold">{user.handle}</div>
                            <div className="text-[10px] text-navy-400 uppercase tracking-tighter">{user.role}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-xl overflow-hidden shadow-lg">
                            {user.platform === "instagram" ? "📸" : "📱"}
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-8 max-w-7xl mx-auto">
                    {/* Welcome Banner */}
                    <div className="relative h-48 rounded-[32px] overflow-hidden group border border-white/10 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1a2536] via-[#0f172a] to-[#070b14]" />
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
                        <div className="relative h-full flex flex-col justify-center px-10">
                            <h1 className="text-3xl font-bold mb-2">Welcome Back, {user.handle}!</h1>
                            <p className="text-navy-300 max-w-sm">Your content is driving amazing engagement. You have <span className="text-primary font-bold">{stats.pendingReferrals} pending approvals</span>.</p>
                            <div className="mt-6 flex items-center gap-4">
                                <button className="px-6 py-2.5 rounded-full bg-primary text-black font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">Create New Link</button>
                                <button className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-sm hover:bg-white/10 transition-all">
                                    <span>🎥</span> View Media Kit
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4 hover:border-primary/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">💰</div>
                            <div className="text-xs text-navy-400 uppercase tracking-widest font-semibold font-mono">Total Earnings</div>
                            <div className="text-3xl font-bold flex items-center gap-2">
                                <span className="text-primary">₹</span>
                                {stats.wallet.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                                <span className="text-xs">↗</span> +12% from last month
                            </div>
                            <div className="absolute bottom-0 left-0 h-1 bg-primary w-0 group-hover:w-full transition-all duration-500" />
                        </div>

                        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4 hover:border-accent/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">🕒</div>
                            <div className="text-xs text-navy-400 uppercase tracking-widest font-semibold font-mono">Pending Payouts</div>
                            <div className="text-3xl font-bold flex items-center gap-2">
                                <span className="text-accent">₹</span>
                                {stats.pendingWallet.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-navy-500 font-bold">Wait for Admin Approval</div>
                            <div className="absolute bottom-0 left-0 h-1 bg-accent w-0 group-hover:w-full transition-all duration-500" />
                        </div>

                        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">🤝</div>
                            <div className="text-xs text-navy-400 uppercase tracking-widest font-semibold font-mono">Total Referrals</div>
                            <div className="text-3xl font-bold flex items-center gap-2">
                                {stats.referrals.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <span className="text-xs">🔥</span> High Conversion
                            </div>
                            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 w-0 group-hover:w-full transition-all duration-500" />
                        </div>

                        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4 hover:border-sky-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">📸</div>
                            <div className="text-xs text-navy-400 uppercase tracking-widest font-semibold font-mono">Follower Growth</div>
                            <div className="text-3xl font-bold flex items-center gap-2">
                                {user.followers}
                            </div>
                            <div className="text-[10px] text-sky-400 font-bold">Updated weekly</div>
                            <div className="absolute bottom-0 left-0 h-1 bg-sky-500 w-0 group-hover:w-full transition-all duration-500" />
                        </div>
                    </div>

                    {/* Referrals & Payouts Detail */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="glass-card rounded-[32px] border border-white/5 p-8 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-xl font-bold">Recent Referrals</h2>
                                        <p className="text-xs text-navy-400 mt-1 italic">Last 5 users who joined via your link</p>
                                    </div>
                                    <button className="text-xs text-primary font-bold hover:underline">View All</button>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { name: "Rahul Sharma", time: "2 hrs ago", status: "Approved", amount: 75 },
                                        { name: "Priya V.", time: "5 hrs ago", status: "Pending", amount: 75 },
                                        { name: "Anish K.", time: "Yesterday", status: "Approved", amount: 75 },
                                        { name: "Sneha M.", time: "Yesterday", status: "Approved", amount: 75 },
                                        { name: "Deepak G.", time: "2 days ago", status: "Approved", amount: 75 }
                                    ].map((ref, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">{ref.name[0]}</div>
                                                <div>
                                                    <div className="text-sm font-bold">{ref.name}</div>
                                                    <div className="text-[10px] text-navy-500 uppercase tracking-tighter">{ref.time}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-primary">+₹{ref.amount}</div>
                                                <div className={`text-[9px] uppercase font-bold tracking-widest ${ref.status === "Approved" ? "text-emerald-500" : "text-amber-500"}`}>{ref.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Referral Link Box */}
                            <div className="glass-card rounded-[32px] border border-primary/20 bg-primary/5 p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">📋</div>
                                <h2 className="text-xl font-bold mb-2">Share Link</h2>
                                <p className="text-xs text-navy-400 mb-6 font-mono leading-relaxed">Share this link in your Bio/Description to start earning commissions.</p>

                                <div className="space-y-3">
                                    <div className="h-14 rounded-2xl bg-black/40 border border-white/10 px-4 flex items-center justify-between group-hover:border-primary/50 transition-all cursor-pointer" onClick={() => { navigator.clipboard.writeText(referralLink); alert("Link Copied!") }}>
                                        <span className="text-xs font-mono text-navy-300 truncate w-48">{referralLink}</span>
                                        <span className="text-xl">📄</span>
                                    </div>
                                    <p className="text-[10px] text-center text-navy-500 uppercase font-bold">Click to copy your link</p>
                                </div>
                            </div>

                            {/* Withdrawal Box */}
                            <div className="glass-card rounded-[32px] border border-white/5 p-8 space-y-6">
                                <h2 className="text-xl font-bold">Quick Withdraw</h2>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <div className="text-[10px] text-navy-400 uppercase font-bold mb-1">Available for Withdrawal</div>
                                    <div className="text-2xl font-bold text-primary">₹{stats.wallet}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-navy-500 uppercase font-bold">Amount (Min. ₹2,500)</label>
                                    <input type="number" defaultValue={2500} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-primary text-sm font-bold" />
                                </div>
                                <button
                                    disabled={stats.wallet < 2500}
                                    className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm tracking-widest disabled:opacity-50 hover:shadow-2xl transition-all"
                                >
                                    REQUEST PAYOUT
                                </button>
                                <p className="text-[9px] text-navy-500 text-center leading-relaxed italic">Approved withdrawals are processed within 24–48 hours to your registered UPI ID.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .glass-card {
          background: rgba(17, 24, 39, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>
        </main>
    )
}
