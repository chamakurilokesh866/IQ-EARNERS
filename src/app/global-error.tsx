"use client"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const refresh = () => {
    if (typeof window !== "undefined") window.location.reload()
  }
  const hardRefresh = () => {
    if (typeof window !== "undefined") {
      window.location.href = (window.location.pathname || "/intro") + "?_r=" + Date.now()
    }
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0c1b2a", color: "#fff", fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ maxWidth: "28rem", width: "100%", background: "#132f47", border: "1px solid #173957", borderRadius: "0.75rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#7c3aed" }}>Something went wrong</h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#7b8da3" }}>An error occurred. Try refreshing the page.</p>
          <div style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={refresh}
              style={{ padding: "0.5rem 1rem", borderRadius: "9999px", background: "#7c3aed", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={hardRefresh}
              style={{ padding: "0.5rem 1rem", borderRadius: "9999px", background: "#1e3a5f", color: "#fff", border: "1px solid #173957", fontWeight: 600, cursor: "pointer" }}
            >
              Hard refresh
            </button>
            <button
              type="button"
              onClick={() => reset()}
              style={{ padding: "0.5rem 1rem", borderRadius: "9999px", background: "transparent", color: "#7b8da3", border: "1px solid #173957", fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
            <a href="/intro" style={{ padding: "0.5rem 1rem", borderRadius: "9999px", background: "#173957", color: "#7b8da3", textDecoration: "none", fontWeight: 600 }}>
              Go to home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
