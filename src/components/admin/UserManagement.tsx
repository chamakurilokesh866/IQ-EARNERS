"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

export function RegisteredUsersCard() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    const j = await fetch("/api/admin/profiles", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] }))
    setProfiles(Array.isArray(j?.data) ? j.data : [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  const removeUser = async (username: string) => {
    if (!confirm(`Remove user "${username}"? They will need to register again.`)) return
    const r = await fetch(`/api/admin/profiles?username=${encodeURIComponent(username)}`, { method: "DELETE", credentials: "include" })
    if (r.ok) load()
    else alert((await r.json().catch(() => ({})))?.error || "Failed to remove")
  }
  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">Registered Users (Profiles)</div>
          <p className="text-sm text-navy-400 mt-0.5">Usernames saved from payment. Remove to allow re-registration.</p>
        </div>
        <button className="admin-btn admin-btn-ghost" onClick={load} disabled={loading}>{loading ? "…" : "Refresh"}</button>
      </div>
      {loading ? (
        <div className="mt-4 h-16 rounded bg-navy-700/50 animate-pulse" />
      ) : !profiles.length ? (
        <div className="mt-4 text-sm text-navy-400">No registered users</div>
      ) : (
        <ul className="mt-4 space-y-2">
          {profiles.map((p) => (
            <li key={p.uid} className="flex items-center justify-between rounded-lg bg-navy-700/80 px-4 py-3">
              <div>
                <span className="font-medium">{p.username || "(no username)"}</span>
                {p.referralCode && <span className="ml-2 text-xs text-navy-400">• {p.referralCode}</span>}
                {p.wallet != null && <span className="ml-2 text-xs text-navy-400">• ₹{p.wallet}</span>}
              </div>
              {p.username && <button className="admin-btn admin-btn-danger text-xs" onClick={() => removeUser(String(p.username))}>Remove</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function UsersTable() {
  const [users, setUsers] = useState<any[]>([])
  const [viewUser, setViewUser] = useState<any | null>(null)
  const [editUser, setEditUser] = useState<any | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Suspended">("All")
  const load = useCallback(async () => {
    const j = await fetch("/api/participants", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] }))
    const arr = Array.isArray(j?.data) ? j.data : []
    const mapped = arr.map((p: any) => ({
      id: p.id,
      name: p.name ?? "Player",
      email: p.email ?? "",
      ip: p.ip ?? "—",
      status: p.status ?? "Active",
      enrollments: p.enrollments ?? 1,
      last: p.joinedAt ? new Date(p.joinedAt).toLocaleString() : "—"
    }))
    setUsers(mapped)
  }, [])
  useEffect(() => { load() }, [load])
  const filtered = useMemo(() => {
    let list = users
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((u) => (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q))
    }
    if (statusFilter !== "All") list = list.filter((u) => (u.status ?? "Active") === statusFilter)
    return list
  }, [users, search, statusFilter])
  const suspend = async (u: any) => {
    if (!u?.id) return
    const res = await fetch(`/api/participants/${u.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "Suspended" }) })
    if (res.ok) load()
  }
  const exportCSV = () => {
    const rows = [["ID", "Name", "Status", "IP", "Enrollments", "Last Active"], ...filtered.map(u => [u.id ?? "", u.name ?? "", u.status ?? "", u.ip ?? "—", String(u.enrollments ?? 0), u.last ?? ""])]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "users.csv"
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    a.remove()
  }
  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between">
        <div className="relative w-64 sm:w-80">
          <input className="w-full admin-form-field text-sm" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="absolute right-3 top-2.5 text-navy-400">🔎</span>
        </div>
        <div className="flex items-center gap-3">
          <select className="admin-form-field text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="All">All Users</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
          <button className="admin-btn admin-btn-primary" onClick={exportCSV}>Export Data</button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-sm text-navy-300">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">IP Address</th>
              <th className="px-3 py-2">Enrollments</th>
              <th className="px-3 py-2">Last Active</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, idx) => (
              <tr key={idx} className="border-t border-navy-700">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-navy-600" />
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-navy-300">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`pill ${u.status === "Active" ? "bg-navy-700 text-success" : "bg-navy-700 text-primary"}`}>{u.status}</span>
                </td>
                <td className="px-3 py-3 text-xs font-mono text-navy-400">{u.ip}</td>
                <td className="px-3 py-3">{u.enrollments}</td>
                <td className="px-3 py-3">{u.last}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <button title="View" onClick={() => setViewUser(u)}>👁️</button>
                    <button title="Edit" onClick={() => setEditUser(u)}>✏️</button>
                    <button title="Suspend" onClick={() => suspend(u)}>⛔</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="mt-4 text-sm text-navy-300">No users{search || statusFilter !== "All" ? " match filter" : ""}</div>}
      </div>
      {viewUser && (
        <div className="mt-4 card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">User Details</div>
            <button className="admin-btn admin-btn-ghost" onClick={() => setViewUser(null)}>Close</button>
          </div>
          <div className="mt-2 text-sm text-navy-300">Name: {viewUser.name}</div>
          <div className="text-sm text-navy-300">Status: {viewUser.status}</div>
          <div className="text-sm text-navy-300">Last Active: {viewUser.last}</div>
        </div>
      )}
      {editUser && (
        <div className="mt-4 card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Edit User</div>
            <button className="admin-btn admin-btn-ghost" onClick={() => setEditUser(null)}>Close</button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <select className="admin-form-field text-sm min-w-[140px]" defaultValue={editUser.status} onChange={(e) => {
              const val = e.target.value
              setEditUser((x: any) => ({ ...x, status: val }))
            }}>
              <option>Active</option>
              <option>Suspended</option>
            </select>
            <button className="admin-btn admin-btn-primary" onClick={async () => {
              if (!editUser?.id) { setEditUser(null); return }
              const res = await fetch(`/api/participants/${editUser.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: editUser.status }) })
              if (res.ok) load()
              setEditUser(null)
            }}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function BlockedUsersCard() {
  const [blocked, setBlocked] = useState<any[]>([])
  const [username, setUsername] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    const j = await fetch("/api/admin/blocked", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] }))
    setBlocked(Array.isArray(j?.data) ? j.data : [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  const blockUser = async () => {
    const u = username.trim()
    if (!u) return
    const res = await fetch("/api/admin/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: u, reason: reason.trim() || "Blocked by admin" })
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok) {
      setUsername("")
      setReason("")
      load()
    } else {
      alert(j?.error ?? "Failed")
    }
  }
  const unblock = async (u: string) => {
    if (!confirm(`Unblock ${u}?`)) return
    const res = await fetch(`/api/admin/blocked?username=${encodeURIComponent(u)}`, { method: "DELETE", credentials: "include" })
    if (res.ok) load()
  }
  return (
    <div className="admin-card p-6 bg-[#0c111c] border-red-500/10 shadow-2xl">
      <div className="font-semibold">Block Username</div>
      <p className="mt-1 text-sm text-navy-400">Blocked users cannot log in. They will see the block reason and can pay ₹50 to get unblocked.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="admin-form-field flex-1 min-w-[120px]"
          placeholder="Username to block"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="admin-form-field flex-1 min-w-[120px]"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button className="admin-btn admin-btn-danger" onClick={blockUser} disabled={!username.trim()}>Block</button>
      </div>
      <div className="mt-4">
        <div className="text-sm font-medium mb-2">Blocked users ({blocked.length})</div>
        {loading ? (
          <div className="h-16 rounded bg-navy-700/50 animate-pulse" />
        ) : blocked.length === 0 ? (
          <div className="text-sm text-navy-400">No blocked users</div>
        ) : (
          <ul className="space-y-2">
            {blocked.map((b) => (
              <li key={b.username} className="flex items-center justify-between rounded-lg bg-navy-700/80 px-4 py-3">
                <div>
                  <span className="font-medium">{b.username}</span>
                  {b.reason && <span className="ml-2 text-xs text-navy-400">— {b.reason}</span>}
                </div>
                <button className="admin-btn admin-btn-success" onClick={() => unblock(b.username)}>Unblock</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function InspectAlertsCard() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [blockedIps, setBlockedIps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    const j = await fetch("/api/admin/inspect-alerts", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ alerts: [], blocked: [] }))
    setAlerts(Array.isArray(j?.alerts) ? j.alerts : [])
    setBlockedIps(Array.isArray(j?.blocked) ? j.blocked : [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  const blockIp = async (ip: string, alertId?: string) => {
    if (!confirm(`Block IP ${ip}? They will see the blocked page and must pay to restore access.`)) return
    const res = await fetch("/api/admin/inspect-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "block", ip, alertId })
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok && j?.ok) load()
    else alert(j?.error ?? "Failed")
  }
  const unblockIp = async (ip: string) => {
    if (!confirm(`Unblock IP ${ip}?`)) return
    const res = await fetch("/api/admin/inspect-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "unblock", ip })
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok && j?.ok) load()
  }
  const formatDate = (ms: number) => ms ? new Date(ms).toLocaleString() : "-"
  return (
    <div className="space-y-6">
      <div className="admin-card p-6 border-amber-500/20">
        <div className="font-semibold flex items-center gap-2">
          <span>🛡️</span> Inspect / DevTools Alerts
        </div>
        <p className="mt-1 text-sm text-navy-400">When users open browser DevTools (F12, right-click inspect), an alert is recorded with their IP. You can block an IP to restrict access.</p>
        {loading ? (
          <div className="mt-4 h-32 rounded bg-navy-700/50 animate-pulse" />
        ) : alerts.length === 0 ? (
          <div className="mt-4 text-sm text-navy-400">No inspect alerts yet</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-navy-600">
                  <th className="py-2 pr-4">IP</th>
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">Page</th>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 50).map((a) => (
                  <tr key={a.id} className="border-b border-navy-700/50">
                    <td className="py-2 pr-4 font-mono text-amber-400">{a.ip}</td>
                    <td className="py-2 pr-4">{a.username || "-"}</td>
                    <td className="py-2 pr-4 max-w-[120px] truncate" title={a.page_url}>{a.page_url || "-"}</td>
                    <td className="py-2 pr-4 text-navy-400">{formatDate(a.created_at)}</td>
                    <td className="py-2">
                      <button className="admin-btn admin-btn-danger text-xs" onClick={() => blockIp(a.ip, a.id)} disabled={blockedIps.some((b) => b.ip === a.ip)}>
                        {blockedIps.some((b) => b.ip === a.ip) ? "Blocked" : "Block"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="admin-card p-6">
        <div className="font-semibold">Blocked IPs ({blockedIps.length})</div>
        <p className="mt-1 text-sm text-navy-400">IPs blocked for DevTools usage. They see the &quot;Access Denied&quot; page and can pay to restore access.</p>
        {blockedIps.length === 0 ? (
          <div className="mt-4 text-sm text-navy-400">No blocked IPs</div>
        ) : (
          <ul className="mt-4 space-y-2">
            {blockedIps.map((b) => (
              <li key={b.ip} className="flex items-center justify-between rounded-lg bg-navy-700/80 px-4 py-3">
                <div>
                  <span className="font-mono text-amber-400">{b.ip}</span>
                  {b.reason && <span className="ml-2 text-xs text-navy-400">— {b.reason}</span>}
                </div>
                <button className="admin-btn admin-btn-success text-xs" onClick={() => unblockIp(b.ip)}>Unblock</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="admin-card p-6 border-navy-600">
        <div className="font-semibold">Pending inspect-unblock payments</div>
        <p className="mt-1 text-sm text-navy-400">Blocked users who paid will appear in <strong>Payments → Pending</strong> with type &quot;inspect_unblock&quot;. Approve there to unblock their IP.</p>
      </div>
    </div>
  )
}

export function IntegrityEventsCard() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>("")

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/integrity", { cache: "no-store", credentials: "include" })
    const j = await r.json().catch(() => ({ data: [] }))
    setEvents(Array.isArray(j?.data) ? j.data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter
    ? events.filter((e: any) =>
      [e.type, e.reason, e.username, JSON.stringify(e.meta || {})].some((s) =>
        String(s).toLowerCase().includes(filter.toLowerCase())
      )
    )
    : events
  const flaggedCount = events.filter((e: any) =>
    ["fast_score_flagged", "time_consistency_flagged"].includes(e?.type)
  ).length

  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold text-lg">🛡️ Smart Integrity Engine</div>
          <p className="text-sm text-navy-400 mt-1">Anti-cheat events: tab/fullscreen violations, flagged scores, time patterns.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="admin-btn admin-btn-ghost">Refresh</button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by type, reason, username..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg bg-navy-800 border border-navy-600 px-3 py-1.5 text-sm w-64"
        />
        {flaggedCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">{flaggedCount} flagged</span>
        )}
      </div>
      {loading ? (
        <div className="mt-4 h-32 rounded bg-navy-700/50 animate-pulse" />
      ) : (
        <ul className="mt-4 space-y-3 max-h-96 overflow-y-auto">
          {filtered.map((e: any) => (
            <li key={e.id} className="rounded-xl bg-navy-700/80 p-3 border border-navy-600 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className={`font-medium ${["fast_score_flagged", "time_consistency_flagged"].includes(e?.type) ? "text-amber-400" : "text-navy-200"}`}>{e.type}</span>
                  <span className="text-navy-400 ml-1">· {e.reason}</span>
                  <p className="text-xs text-navy-400 mt-0.5 truncate">{e.username || "—"} · {e.created_at ? new Date(e.created_at).toLocaleString() : ""}</p>
                  {e.meta && Object.keys(e.meta).length > 0 && (
                    <pre className="mt-1 text-xs text-navy-500 overflow-x-auto max-w-full">{JSON.stringify(e.meta)}</pre>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && !filtered.length && <p className="mt-4 text-sm text-navy-400">No integrity events yet.</p>}
    </div>
  )
}
