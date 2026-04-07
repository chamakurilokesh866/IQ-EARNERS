"use client"

import { useEffect, useState } from "react"
import TargetAudienceCard from "./TargetAudienceCard"
import { BellIcon } from "./AnimatedIcons"

export default function AdminSystem() {
  const [cacheOk, setCacheOk] = useState(true)
  const [queueOk, setQueueOk] = useState(false)
  const [maintenance, setMaintenance] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [entryFee, setEntryFee] = useState<number>(100)
  const [currency, setCurrency] = useState<string>("INR")
  const [useResendEmails, setUseResendEmails] = useState<boolean>(false)
  const [languageSelectionEnabled, setLanguageSelectionEnabled] = useState<boolean>(true)
  const [allowDeveloperOptions, setAllowDeveloperOptions] = useState<boolean>(false)
  const [adminIp, setAdminIp] = useState<string>("...")
  const run = (name: string, fn: () => void) => {
    fn()
    setLogs((prev) => [`${new Date().toLocaleTimeString()} • ${name} executed`, ...prev].slice(0, 8))
  }
  // load settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data ?? {}
        if (typeof d.entryFee === "number") setEntryFee(d.entryFee)
        if (typeof d.currency === "string") setCurrency(d.currency)
        if (typeof d.useResendEmails === "boolean") setUseResendEmails(d.useResendEmails)
        if (typeof d.languageSelectionEnabled === "boolean") setLanguageSelectionEnabled(d.languageSelectionEnabled)
        if (typeof d.allowDeveloperOptions === "boolean") setAllowDeveloperOptions(d.allowDeveloperOptions)
      })
      .catch(() => { })

    fetch("/api/admin/ip")
      .then((r) => r.json())
      .then((j) => {
        if (j?.ip) setAdminIp(j.ip)
      })
      .catch(() => { })
  }, [])
  return (
    <div className="space-y-6">
      <div className="font-semibold">System Status</div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="card p-5">
          <div className="text-sm text-navy-300">Admin Address (IP)</div>
          <div className="mt-2 text-sm text-green-400 font-mono bg-green-500/10 border border-green-500/20 px-3 py-1 rounded inline-block">{adminIp}</div>
          <p className="mt-3 text-[10px] text-navy-400">Your current IP is protected.</p>
        </div>
        <div className="card p-5">
          <div className="text-sm text-navy-300">Cache</div>
          <div className={`mt-2 pill ${cacheOk ? "bg-success text-black" : "bg-primary"}`}>{cacheOk ? "OK" : "Degraded"}</div>
          <button className="mt-3 rounded bg-navy-700 px-4 py-2 text-sm" onClick={() => run("Clear Cache", () => setCacheOk(true))}>Clear Cache</button>
        </div>
        <div className="card p-5">
          <div className="text-sm text-navy-300">Job Queue</div>
          <div className={`mt-2 pill ${queueOk ? "bg-success text-black" : "bg-primary"}`}>{queueOk ? "OK" : "Degraded"}</div>
          <button className="mt-3 rounded bg-navy-700 px-4 py-2 text-sm" onClick={() => run("Restart Workers", () => setQueueOk(true))}>Restart Workers</button>
        </div>
        <div className="card p-5">
          <div className="text-sm text-navy-300">Maintenance Mode</div>
          <div className={`mt-2 pill ${maintenance ? "bg-primary" : "bg-success text-black"}`}>{maintenance ? "Enabled" : "Disabled"}</div>
          <button className="mt-3 rounded bg-navy-700 px-4 py-2 text-sm" onClick={() => run(maintenance ? "Disable Maintenance" : "Enable Maintenance", () => setMaintenance((m) => !m))}>{maintenance ? "Disable" : "Enable"}</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card p-6">
          <div className="font-semibold">Settings</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-sm">Entry Fee</div>
              <input
                className="mt-1 w-full admin-form-field"
                type="number"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
              />
            </div>
            <div>
              <div className="text-sm">Currency</div>
              <input
                className="mt-1 w-full admin-form-field"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={useResendEmails}
                onChange={(e) => setUseResendEmails(e.target.checked)}
              />
              <span>Use Resend emails (OTP, forgot password, broadcasts)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={languageSelectionEnabled}
                onChange={(e) => setLanguageSelectionEnabled(e.target.checked)}
              />
              <span>Enable Language Selection in Start Quiz Modal</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary"
                checked={allowDeveloperOptions}
                onChange={(e) => setAllowDeveloperOptions(e.target.checked)}
              />
              <span className="text-red-400 font-medium">Allow Developer Options (Unblocks Right Click/Inspect)</span>
            </label>
            <p className="text-xs text-navy-300 pt-1">
              Keep this off for security unless testing.
            </p>
          </div>
          <button
            className="mt-3 pill bg-primary"
            onClick={async () => {
              await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entryFee, currency, useResendEmails, languageSelectionEnabled, allowDeveloperOptions }),
              })
              run("Save Settings", () => { })
            }}
          >
            Save Settings
          </button>
        </div>
        <TargetAudienceCard />
        <div className="card p-6">
          <div className="font-semibold">Warm Cache</div>
          <div className="mt-2 text-sm text-navy-300">Prime common endpoints to speed up user navigation.</div>
          <button className="mt-3 pill bg-primary" onClick={async () => {
            const endpoints = ["/api/practice-quiz", "/api/tournaments", "/api/leaderboard", "/api/prizes", "/api/stats"]
            const start = Date.now()
            await Promise.all(endpoints.map((e) => fetch(e).catch(() => { })))
            const dur = Date.now() - start
            run(`Warm Cache (${dur}ms)`, () => { })
          }}>Warm Now</button>
        </div>
      </div>
      <div className="card p-6">
        <div className="font-semibold">Data Tools</div>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-sm text-navy-300">Clear all user profiles. Users will need to set username again after payment.</p>
            <button className="mt-2 pill bg-navy-700 hover:bg-navy-600" onClick={async () => {
              if (!confirm("Clear all users (profiles)? This will remove all usernames. Payments and other data are kept.")) return
              const r = await fetch("/api/admin/clear-users", { method: "POST", credentials: "include" })
              const j = await r.json().catch(() => ({}))
              if (r.ok && j?.ok) run("Clear Users", () => { })
              else setLogs((prev) => [`${new Date().toLocaleTimeString()} • ${j?.error ?? "Clear failed"}`, ...prev].slice(0, 8))
            }}>Clear Users (Profiles)</button>
          </div>
          <div>
            <p className="text-sm text-navy-300">Reset all site data (profiles, payments, tournaments, prizes, leaderboard, etc.). This will log out users.</p>
            <button className="mt-2 pill bg-primary" onClick={async () => {
              if (!confirm("Reset all site data? This will clear profiles, payments, tournaments, quizzes, leaderboard, referrals and log out users.")) return
              const r = await fetch("/api/admin/reset", { method: "POST", credentials: "include" })
              const j = await r.json().catch(() => ({}))
              if (r.ok && j?.ok) {
                run("Reset Site Data" + (j?.warning ? " (see warning)" : ""), () => { })
                if (j?.warning) setLogs((prev) => [`${new Date().toLocaleTimeString()} • ${j.warning}`, ...prev].slice(0, 8))
              } else {
                setLogs((prev) => [`${new Date().toLocaleTimeString()} • ${j?.error ?? "Reset failed"}`, ...prev].slice(0, 8))
              }
            }}>Reset Site Data</button>
          </div>
        </div>
      </div>
      <div className="card p-6">
        <div className="flex items-center gap-2 font-semibold mb-1">
          <BellIcon size={20} className="text-primary" />
          <span>Push Notification Broadcast</span>
        </div>
        <p className="text-sm text-navy-400 mb-4">Send an instant push alert to all subscribed mobile and desktop users.</p>
        <div className="space-y-4 max-w-lg">
          <div>
            <div className="text-sm mb-1 text-navy-200">Broadcast Title</div>
            <input
              className="w-full rounded-xl bg-navy-800 border border-navy-600 px-4 py-2.5 text-sm focus:border-primary/50 outline-none transition-all"
              placeholder="e.g. New Prize Added!"
              id="push-title"
            />
          </div>
          <div>
            <div className="text-sm mb-1 text-navy-200">Message Content</div>
            <textarea
              className="w-full rounded-xl bg-navy-800 border border-navy-600 px-4 py-2.5 text-sm focus:border-primary/50 outline-none transition-all min-h-[100px]"
              placeholder="Write your announcement here..."
              id="push-message"
            />
          </div>
          <div>
            <div className="text-sm mb-1 text-navy-200">Target URL (optional)</div>
            <input
              className="w-full rounded-xl bg-navy-800 border border-navy-600 px-4 py-2.5 text-sm focus:border-primary/50 outline-none transition-all"
              placeholder="/prizes or /daily-quiz"
              id="push-url"
              defaultValue="/home"
            />
          </div>
          <button
            className="w-full pill bg-gradient-to-r from-primary to-blue-500 py-3 font-bold text-navy-950 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            onClick={async (e) => {
              const btn = e.currentTarget
              const title = (document.getElementById("push-title") as HTMLInputElement).value
              const message = (document.getElementById("push-message") as HTMLTextAreaElement).value
              const url = (document.getElementById("push-url") as HTMLInputElement).value
              if (!message) return alert("Message is required")

              btn.disabled = true
              btn.innerText = "Sending..."

              try {
                const r = await fetch("/api/admin/notices", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title, message, link: url }),
                  credentials: "include"
                })
                const j = await r.json()
                if (j.ok) {
                  run(`Notice Created & Broadcast Sent`, () => { })
                    ; (document.getElementById("push-title") as HTMLInputElement).value = ""
                    ; (document.getElementById("push-message") as HTMLTextAreaElement).value = ""
                } else {
                  alert("Failed to send: " + (j.error || "Unknown error"))
                }
              } catch (err) {
                alert("Error sending broadcast")
              } finally {
                btn.disabled = false
                btn.innerText = "Send Broadcast Now"
              }
            }}
          >
            Send Broadcast Now
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="font-semibold">Recent Operations</div>
        <ul className="mt-3 space-y-2 text-sm">
          {logs.map((l, i) => (
            <li key={i} className="rounded bg-navy-700 p-2">{l}</li>
          ))}
          {!logs.length && <li className="rounded bg-navy-700 p-2 text-navy-300">No operations yet</li>}
        </ul>
      </div>
    </div>
  )
}
