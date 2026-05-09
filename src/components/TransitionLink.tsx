"use client"

import Link, { LinkProps } from "next/link"
import { ReactNode, forwardRef } from "react"
import { useUI } from "../context/UIContext"
import { useRouter, usePathname } from "next/navigation"
import { withSid } from "../lib/session"
import { getBootstrapUrl } from "@/lib/bootstrapFetch"

const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps & { children: ReactNode; className?: string; style?: React.CSSProperties }>(function TL(props, ref) {
  const { setLoading, setTransition } = useUI()
  const router = useRouter()
  const pathname = usePathname() ?? "/"
  const { style, className, ...linkProps } = props
  const getLabel = (p: string) => {
    const labels: Record<string, string> = { "/": "Home", "/home": "Home", "/intro": "Intro", "/leaderboard": "Leaderboard", "/tournaments": "Tournaments", "/prizes": "Prizes", "/user": "User", "/daily-quiz": "Daily Quiz" }
    return labels[p] ?? p.split("/").filter(Boolean).pop() ?? "Page"
  }
  const href = (props as any).href
  const resolvedHref = typeof href === "string" ? withSid(href) : href
  const toPath = typeof href === "string" && href.startsWith("/") ? href.split("?")[0] : (href?.pathname ?? "")
  const content = (
    <Link
      {...linkProps}
      href={resolvedHref}
      ref={ref as any}
      prefetch={props.prefetch ?? true}
      className={style ? "block w-full" : className}
      onMouseEnter={() => {
        if (toPath && typeof toPath === "string") {
          try { router.prefetch(withSid(toPath)) } catch {}
          if (toPath === "/leaderboard") fetch("/api/leaderboard").catch(() => {})
          if (toPath === "/prizes") fetch("/api/prizes").catch(() => {})
          if (toPath === "/tournaments") fetch("/api/tournaments").catch(() => {})
          if (toPath === "/daily-quiz") {
            fetch("/api/quizzes").catch(() => {})
            fetch("/api/quiz-completion").catch(() => {})
          }
          if (toPath === "/user") { fetch(getBootstrapUrl()).catch(() => {}); fetch("/api/progress").catch(() => {}) }
        }
      }}
      onClick={(e) => {
        try {
          e.preventDefault()
          if (resolvedHref) {
            setLoading(true)
            setTransition(getLabel(pathname), getLabel(toPath || "/"))
            router.push(typeof resolvedHref === "string" ? resolvedHref : (resolvedHref as any).pathname || "/")
          }
        } catch {}
        props.onClick?.(e as any)
      }}
    >
      {props.children}
    </Link>
  )
  if (style) {
    return (
      <span className={className} style={style}>
        {content}
      </span>
    )
  }
  return content
})

export default TransitionLink
