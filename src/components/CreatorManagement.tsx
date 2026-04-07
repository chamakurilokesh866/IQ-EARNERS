"use client"
import { useState, useEffect, useCallback } from "react"

export default function CreatorManagement() {
    const [apps, setApps] = useState<any[]>([])
    const [creators, setCreators] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending")
    const [hubEnabled, setHubEnabled] = useState(true)

    const loadSettings = useCallback(async () => {
        try {
            const r = await fetch("/api/settings")
            const j = await r.json()
            if (j.ok && typeof j.data?.creatorHubEnabled === "boolean") {
                setHubEnabled(j.data.creatorHubEnabled)
            }
        } catch { }
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const r = await fetch("/api/admin/creators", { credentials: "include" })
            const j = await r.json()
            if (j.ok) {
                setApps(j.applications || [])
                setCreators(j.creators || [])
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
        loadSettings()
    }, [load, loadSettings])

    const toggleHub = async () => {
        const next = !hubEnabled
        setHubEnabled(next)
        await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creatorHubEnabled: next }),
            credentials: "include"
        })
    }

    const handleAction = async (email: string, action: "approve" | "reject", feedback: string, role?: string) => {
        const r = await fetch("/api/admin/creators", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, action, feedback, role }),
            credentials: "include"
        })
        if (r.ok) load()
    }

    const filteredApps = apps.filter(a => a.status === filter)

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>✨</span> Creator Hub Management
                </h2>
                <div className="flex bg-navy-800 rounded-lg p-1 gap-4 items-center px-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-navy-400 font-bold uppercase tracking-widest">Hub Status</span>
                        <button
                            onClick={toggleHub}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${hubEnabled ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-red-500/20 border-red-500/50 text-red-500"}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${hubEnabled ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
                            <span className="text-[10px] uppercase font-bold tracking-wider">{hubEnabled ? "Online" : "Offline"}</span>
                        </button>
                    </div>
                    <div className="w-[1px] h-6 bg-navy-700 mx-2" />
                    <div className="flex bg-navy-900/50 rounded-md p-0.5">
                        {(["pending", "approved", "rejected"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all capitalize ${filter === f ? "bg-primary text-black" : "text-navy-400 hover:text-white"}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-stat-card">
                    <div className="text-xs text-navy-400 uppercase">Pending Apps</div>
                    <div className="text-2xl font-bold text-amber-400">{apps.filter(a => a.status === "pending").length}</div>
                </div>
                <div className="admin-stat-card">
                    <div className="text-xs text-navy-400 uppercase">Total Partners</div>
                    <div className="text-2xl font-bold text-primary">{creators.length}</div>
                </div>
                <div className="admin-stat-card">
                    <div className="text-xs text-navy-400 uppercase">Total Creator Wallet</div>
                    <div className="text-2xl font-bold text-emerald-400">₹{creators.reduce((sum, c) => sum + (c.wallet || 0), 0).toLocaleString()}</div>
                </div>
            </div>

            <div className="admin-card overflow-hidden">
                <div className="p-4 border-b border-navy-700 bg-navy-800/50">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-navy-400">Applications</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-navy-700 text-navy-400">
                                <th className="p-4">Creator</th>
                                <th className="p-4">Platform</th>
                                <th className="p-4">Followers</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">AI Suggestion</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="p-10 text-center animate-pulse">Loading Applications...</td></tr>
                            ) : filteredApps.length === 0 ? (
                                <tr><td colSpan={6} className="p-10 text-center text-navy-500 italic">No {filter} applications found.</td></tr>
                            ) : (
                                filteredApps.map(app => (
                                    <tr key={app.id} className="border-b border-navy-700/50 hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold">{app.name}</div>
                                            <div className="text-[10px] text-navy-400 font-mono">{app.email}</div>
                                            <div className="text-xs text-primary font-bold mt-1">@{app.handle}</div>
                                        </td>
                                        <td className="p-4 capitalize">{app.platform}</td>
                                        <td className="p-4 font-bold text-primary">{app.followers.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${app.type === "partner" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>
                                                {app.type}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs italic text-navy-300">"{app.suggestedRole || "Verified Creator"}"</div>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            {app.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(app.email, "approve", "Approved by Admin", app.suggestedRole)}
                                                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-[10px] hover:bg-emerald-400 transition-colors"
                                                    >
                                                        APPROVE
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(app.email, "reject", "Profile does not meet criteria")}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 font-bold text-[10px] hover:bg-red-500 hover:text-white transition-all"
                                                    >
                                                        REJECT
                                                    </button>
                                                </>
                                            )}
                                            {app.cvUrl && (
                                                <button className="px-3 py-1.5 rounded-lg bg-navy-700 text-navy-300 font-bold text-[10px] hover:bg-navy-600 transition-colors">
                                                    📄 VIEW CV
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="admin-card">
                <div className="p-4 border-b border-navy-700 bg-navy-800/50">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-navy-400">Active Creators List</h3>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {creators.map(c => (
                            <div key={c.uid} className="p-4 rounded-xl bg-navy-800/80 border border-white/5 flex flex-col items-center text-center space-y-2">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">📸</div>
                                <div className="font-bold">@{c.handle}</div>
                                <div className="text-[10px] text-navy-400 font-mono italic">{c.role}</div>
                                <div className="text-primary font-bold">₹{c.wallet.toLocaleString()}</div>
                                <div className="flex gap-2 w-full mt-2">
                                    <button className="flex-1 py-1 rounded-md bg-white/5 text-[9px] font-bold hover:bg-white/10 transition-all uppercase">Stats</button>
                                    <button className="flex-1 py-1 rounded-md bg-white/5 text-[9px] font-bold hover:bg-white/10 transition-all uppercase">Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
