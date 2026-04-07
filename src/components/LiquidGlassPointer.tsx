"use client"

import { useEffect } from "react"

/**
 * One document-level listener (rAF-throttled) that tracks the element under the pointer
 * and exposes a cursor-following radial sheen on interactive targets only.
 */
const SELECTOR = [
  "button:not(.no-liquid-glass):not([disabled])",
  'input[type="submit"]:not(.no-liquid-glass):not([disabled])',
  '[role="button"]:not(.no-liquid-glass):not([aria-disabled="true"])',
  "a.liquid-glass-hit:not([aria-disabled=\"true\"])",
  '[data-liquid-glass]:not([data-liquid-glass="false"])',
].join(",")

function resolveTarget(node: Element | null): HTMLElement | null {
  if (!node) return null
  const el = node.closest(SELECTOR)
  if (!el || !(el instanceof HTMLElement)) return null
  if (el.matches("button, input[type=submit]") && (el as HTMLButtonElement | HTMLInputElement).disabled) {
    return null
  }
  return el
}

export default function LiquidGlassPointer() {
  useEffect(() => {
    let current: HTMLElement | null = null
    let raf = 0

    const deactivate = () => {
      current?.classList.remove("liquid-glass-active")
      current = null
    }

    const apply = (e: Pick<PointerEvent, "clientX" | "clientY">) => {
      const under = document.elementFromPoint(e.clientX, e.clientY)
      const next = resolveTarget(under)
      if (next !== current) {
        deactivate()
        current = next
        current?.classList.add("liquid-glass-active")
      }
      if (current) {
        const r = current.getBoundingClientRect()
        current.style.setProperty("--lg-x", `${e.clientX - r.left}px`)
        current.style.setProperty("--lg-y", `${e.clientY - r.top}px`)
      }
    }

    const onPointer = (e: PointerEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        apply(e)
      })
    }

    const onLeaveWindow = () => deactivate()

    document.addEventListener("pointermove", onPointer, { passive: true })
    document.addEventListener("pointerdown", onPointer, { passive: true })
    document.addEventListener("pointerleave", onLeaveWindow)
    window.addEventListener("blur", onLeaveWindow)

    return () => {
      deactivate()
      document.removeEventListener("pointermove", onPointer)
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("pointerleave", onLeaveWindow)
      window.removeEventListener("blur", onLeaveWindow)
    }
  }, [])

  return null
}
