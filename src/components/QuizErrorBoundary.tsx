"use client"

import React from "react"

type Props = { children: React.ReactNode; fallback?: React.ReactNode }

export class QuizErrorBoundary extends React.Component<
  Props,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Quiz error:", error, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="card p-8 text-center max-w-md mx-auto animate-fade">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-amber-400">Something went wrong</h2>
          <p className="mt-2 text-sm text-white/70">An error occurred. Try refreshing the page.</p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button type="button" onClick={() => window.location.reload()} className="pill bg-primary px-6 py-3 font-semibold">Refresh</button>
            <button type="button" onClick={() => { const u = window.location.pathname + (window.location.search || "") + (window.location.search ? "&" : "?") + "_r=" + Date.now(); window.location.href = u }} className="pill bg-navy-700 border border-navy-600 px-6 py-3 font-semibold">Hard refresh</button>
            <button type="button" onClick={() => this.setState({ hasError: false, error: null })} className="pill bg-white/10 px-6 py-3 font-semibold">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
