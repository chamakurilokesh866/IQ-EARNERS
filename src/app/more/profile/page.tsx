"use client"

import Navbar from "../../../components/Navbar"
import { useEffect, useState } from "react"
import { fetchWithCsrf } from "@/lib/fetchWithCsrf"

export default function Page() {
  const [username, setUsername] = useState("")
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((j) => setUsername(j?.data?.username ?? "")).catch(() => setUsername(""))
  }, [])
  const save = async () => {
    const res = await fetchWithCsrf("/api/user/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) })
    setSaved(res.ok)
  }
  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="text-2xl font-bold">My Profile</div>
        <div className="mt-6 card p-6 sm:p-8 max-w-lg border border-white/10 rounded-2xl shadow-xl bg-navy-950/40 backdrop-blur-sm">
          <label htmlFor="profile-username" className="form-ui-label-dark">Username</label>
          <input
            id="profile-username"
            className="modal-input-enhanced text-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your display username"
            autoComplete="username"
          />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="px-6 py-3 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all" onClick={save}>
              Save changes
            </button>
            {saved && <span className="text-sm font-semibold text-emerald-400">Saved</span>}
          </div>
        </div>
      </section>
    </main>
  )
}
