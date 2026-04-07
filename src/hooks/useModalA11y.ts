"use client"

import { useEffect, useCallback, useRef } from "react"

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"

/**
 * Hook for modal accessibility: Escape to close + focus trap.
 * Call with the modal's content ref and onClose handler.
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const previousActiveRef = useRef<Element | null>(null)

  const getFocusables = useCallback(() => {
    const el = contentRef.current
    if (!el) return []
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (e) => e.offsetParent !== null && !e.hasAttribute("aria-hidden")
    )
  }, [])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
      // Focus trap: Tab cycles within modal
      if (e.key === "Tab") {
        const focusables = getFocusables()
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, getFocusables])

  // Store previously focused element and focus first focusable on open
  useEffect(() => {
    if (!isOpen) return
    previousActiveRef.current = document.activeElement as Element | null
    const t = requestAnimationFrame(() => {
      const focusables = getFocusables()
      if (focusables.length > 0) focusables[0].focus()
    })
    return () => {
      cancelAnimationFrame(t)
      if (previousActiveRef.current && typeof (previousActiveRef.current as HTMLElement).focus === "function") {
        (previousActiveRef.current as HTMLElement).focus()
      }
    }
  }, [isOpen, getFocusables])

  return contentRef
}
