import type { jsPDF } from "jspdf"
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE_URL } from "@/lib/seo"

export type CertificateType = "1st" | "runner_up" | "participation"

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result as string)
      r.onerror = () => resolve(null)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function setFittedCenterText(
  doc: jsPDF,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  startSize: number,
  minSize = 10
) {
  let size = startSize
  doc.setFontSize(size)
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 1
    doc.setFontSize(size)
  }
  doc.text(text, centerX, y, { align: "center" })
}

function resolveAssetUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`
  }
  return url
}

function drawIqEarnersStamp(doc: jsPDF, cx: number, cy: number, text: string, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setLineWidth(0.6)
  doc.circle(cx, cy, 13, "S")
  doc.setLineWidth(0.25)
  doc.circle(cx, cy, 10.8, "S")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(6)
  doc.setTextColor(color[0], color[1], color[2])
  doc.text("IQ EARNERS", cx, cy - 2.8, { align: "center" })
  doc.text(text.toUpperCase(), cx, cy + 1.2, { align: "center" })
  doc.text("VERIFIED MEMBER", cx, cy + 5.2, { align: "center" })
}

async function renderParticipationBranded(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  opts: {
    recipientName: string
    tournamentName: string
    date: string
    score: number
    total: number
    memberId?: string
    siteName: string
    siteUrl: string
    logoUrl?: string
    contextLine?: string
  }
) {
  const cream = [252, 252, 250]
  const ink = [30, 41, 59]
  const muted = [100, 116, 139]
  const gold = [180, 140, 60]

  doc.setFillColor(cream[0], cream[1], cream[2])
  doc.rect(0, 0, pageW, pageH, "F")

  doc.setDrawColor(gold[0], gold[1], gold[2])
  doc.setLineWidth(1)
  doc.rect(10, 10, pageW - 20, pageH - 20, "S")
  doc.setLineWidth(0.35)
  doc.rect(14, 14, pageW - 28, pageH - 28, "S")

  const innerPad = 22
  let y = 22

  const logoCandidate = opts.logoUrl ? resolveAssetUrl(opts.logoUrl) : resolveAssetUrl(DEFAULT_OG_IMAGE_URL)
  const logoData = await urlToDataUrl(logoCandidate)
  if (logoData) {
    const lw = 32
    const lh = 12
    try {
      doc.addImage(logoData, "PNG", pageW / 2 - lw / 2, y, lw, lh)
    } catch {
      try {
        doc.addImage(logoData, "JPEG", pageW / 2 - lw / 2, y, lw, lh)
      } catch { /* skip logo */ }
    }
    y += lh + 6
  } else {
    y += 4
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(gold[0], gold[1], gold[2])
  doc.text(opts.siteName.toUpperCase(), pageW / 2, y, { align: "center", charSpace: 1.2 })
  y += 7
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(muted[0], muted[1], muted[2])
  doc.text(opts.siteUrl.replace(/^https?:\/\//, ""), pageW / 2, y, { align: "center" })
  y += 16

  doc.setFont("helvetica", "bold")
  doc.setFontSize(26)
  doc.setTextColor(ink[0], ink[1], ink[2])
  doc.text("Certificate of Participation", pageW / 2, y, { align: "center" })
  y += 14

  const plateTop = y - 4
  const plateH = Math.min(72, pageH - plateTop - 48)
  doc.setDrawColor(gold[0], gold[1], gold[2])
  doc.setLineWidth(0.25)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(innerPad, plateTop, pageW - innerPad * 2, plateH, 2, 2, "FD")

  y = plateTop + 14
  const textMax = pageW - innerPad * 2 - 24
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(muted[0], muted[1], muted[2])
  doc.text("This is to certify that", pageW / 2, y, { align: "center" })
  y += 12

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(ink[0], ink[1], ink[2])
  const nameLines = doc.splitTextToSize(opts.recipientName || "Participant", textMax)
  for (const line of nameLines) {
    doc.text(line, pageW / 2, y, { align: "center" })
    y += 9
  }
  y += 4

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(muted[0], muted[1], muted[2])
  const ctx =
    opts.contextLine ||
    "For active participation and dedication in our competitive quiz program."
  const ctxLines = doc.splitTextToSize(ctx, textMax)
  for (const line of ctxLines) {
    doc.text(line, pageW / 2, y, { align: "center" })
    y += 6
  }
  y += 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(ink[0], ink[1], ink[2])
  doc.text("Quiz / Program", innerPad + 12, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  const titleLines = doc.splitTextToSize(opts.tournamentName || "—", textMax - 8)
  let ty = y + 6
  for (const line of titleLines) {
    doc.text(line, innerPad + 12, ty)
    ty += 6
  }
  y = ty + 10

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(ink[0], ink[1], ink[2])
  doc.text("Date of issue", innerPad + 12, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text(opts.date, innerPad + 12, y + 7)

  if (opts.score > 0 || opts.total > 0) {
    doc.setFont("helvetica", "bold")
    doc.text("Score", pageW - innerPad - 12, y, { align: "right" })
    doc.setFont("helvetica", "normal")
    doc.text(`${opts.score} / ${opts.total}`, pageW - innerPad - 12, y + 7, { align: "right" })
  }

  const footerY = pageH - 28
  const verificationId =
    opts.memberId ||
    (
      (opts.recipientName.slice(0, 3) || "USR") +
      (opts.tournamentName.slice(0, 3) || "EVT") +
      opts.date.replace(/[^0-9]/g, "")
    ).toUpperCase()
  const verifyPath = `/verify/${verificationId}`
  const verifyUrl = `${opts.siteUrl.replace(/\/$/, "")}${verifyPath.startsWith("/") ? verifyPath : `/${verifyPath}`}`

  try {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`
    const qrRes = await fetch(qrApiUrl)
    const qrBlob = await qrRes.blob()
    const qrBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(qrBlob)
    })
    doc.addImage(qrBase64, "PNG", pageW - innerPad - 18, footerY - 6, 16, 16)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6)
    doc.setTextColor(gold[0], gold[1], gold[2])
    doc.text("SCAN TO VERIFY", pageW - innerPad - 10, footerY + 14, { align: "center" })
  } catch {
    /* no QR */
  }

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(muted[0], muted[1], muted[2])
  doc.text(`ID: ${verificationId}`, innerPad, footerY + 4)
  doc.text(opts.siteUrl.replace(/^https?:\/\//, ""), innerPad, footerY + 10)
}

/**
 * Generate a premium certificate PDF for IQ Earners.
 * Supports branded themes for 1st Place, Runner Up, and Participation.
 */
export async function generateCertificate(options: {
  recipientName: string
  tournamentName: string
  type?: CertificateType
  score?: number
  total?: number
  date?: string
  templateImageBase64?: string
  memberId?: string
  siteName?: string
  siteUrl?: string
  logoUrl?: string
  contextLine?: string
}) {
  if (typeof window === "undefined") return

  const { jsPDF } = await import("jspdf")

  const doc = new jsPDF({
    orientation: "landscape",
    format: "a4",
    unit: "mm"
  })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const {
    recipientName,
    tournamentName,
    type = "1st",
    score = 0,
    total = 0,
    date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    templateImageBase64,
    memberId
  } = options

  const brandName = options.siteName ?? SITE_NAME
  const brandUrl = options.siteUrl ?? SITE_URL

  const hasTemplate = !!templateImageBase64
  const darkNavy = [15, 23, 42]
  const gold = [198, 166, 89]
  const slate600 = [71, 85, 105]

  const themes = {
    "1st": {
      primary: [234, 179, 8],
      secondary: [254, 240, 138],
      label: "CHAMPION",
      badgeText: "CHAMPION"
    },
    "runner_up": {
      primary: [30, 64, 175],
      secondary: [191, 219, 254],
      label: "1ST RUNNER UP",
      badgeText: "RUNNER UP"
    },
    "participation": {
      primary: [16, 185, 129],
      secondary: [209, 250, 229],
      label: "PARTICIPANT",
      badgeText: "MEMBER"
    }
  }
  const theme = themes[type] || themes["1st"]

  if (templateImageBase64) {
    let imgData = templateImageBase64
    if (templateImageBase64.startsWith("http")) {
      try {
        const res = await fetch(templateImageBase64)
        const blob = await res.blob()
        imgData = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (err) {
        console.error("Failed to fetch certificate template image", err)
      }
    } else if (!templateImageBase64.startsWith("data:")) {
      imgData = "data:image/png;base64," + templateImageBase64
    }

    try {
      doc.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST")
    } catch {
      try {
        doc.addImage(imgData, "PNG", 0, 0, pageW, pageH, undefined, "FAST")
      } catch { }
    }

    if (hasTemplate) {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])

      if (type === "participation") {
        doc.setFontSize(22)
        doc.text(recipientName || "Valued Participant", pageW / 2, 92, { align: "center" })
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(slate600[0], slate600[1], slate600[2])
        const subtitle = doc.splitTextToSize(tournamentName || "", pageW - 50)
        let ly = 108
        for (const line of subtitle) {
          doc.text(line, pageW / 2, ly, { align: "center" })
          ly += 6
        }
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.text(`Issued: ${date}`, pageW / 2, ly + 8, { align: "center" })
        if (score > 0 || total > 0) {
          doc.text(`Score: ${score} / ${total}`, pageW / 2, ly + 16, { align: "center" })
        }
        doc.setFontSize(8)
        doc.setTextColor(gold[0], gold[1], gold[2])
        doc.text(brandName, pageW / 2, pageH - 14, { align: "center" })
      } else {
        // Template-safe overlay placement with width fitting (prevents clipping / overflow on long names).
        const safeName = (recipientName || "Valued Participant").toUpperCase()
        const safeTournament = (tournamentName || "").toUpperCase()
        const yName = pageH * 0.49
        const yTournament = pageH * 0.67
        const yScore = pageH * 0.73
        const yDate = pageH * 0.89
        const maxNameW = pageW * 0.62
        const maxTournamentW = pageW * 0.48
        const maxScoreW = pageW * 0.28

        doc.setFontSize(22)
        setFittedCenterText(doc, safeName, pageW / 2, yName, maxNameW, 22, 12)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(12)
        doc.setTextColor(slate600[0], slate600[1], slate600[2])
        setFittedCenterText(doc, safeTournament, pageW / 2, yTournament, maxTournamentW, 12, 9)
        if (Number(total) > 0 && Number(score) >= 0) {
          setFittedCenterText(doc, `Score: ${score}/${total}`, pageW / 2, yScore, maxScoreW, 11, 9)
        }
        doc.setFontSize(10)
        doc.text(`Issued: ${date}`, pageW * 0.84, yDate, { align: "center" })
      }

      const fileName = `IQE-Cert-${(recipientName || "user").replace(/\s+/g, "_")}.pdf`
      doc.save(fileName)
      return
    }
  }

  if (!hasTemplate && type === "participation") {
    await renderParticipationBranded(doc, pageW, pageH, {
      recipientName,
      tournamentName,
      date,
      score,
      total,
      memberId,
      siteName: brandName,
      siteUrl: brandUrl,
      logoUrl: options.logoUrl,
      contextLine: options.contextLine
    })
    const safeName = (recipientName || "User").replace(/[^a-zA-Z0-9-]/g, "_")
    doc.save(`IQ-Earners-Participation-${safeName}.pdf`)
    return
  }

  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.rect(0, 0, pageW, pageH, "F")

  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.triangle(0, 0, 70, 0, 0, 70, "F")
  doc.setFillColor(theme.secondary[0], theme.secondary[1], theme.secondary[2])
  doc.triangle(0, 0, 45, 0, 0, 45, "F")

  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.triangle(pageW, pageH, pageW - 70, pageH, pageW, pageH - 70, "F")
  doc.setFillColor(theme.secondary[0], theme.secondary[1], theme.secondary[2])
  doc.triangle(pageW, pageH, pageW - 45, pageH, pageW, pageH - 45, "F")

  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.3)
  doc.rect(10, 10, pageW - 20, pageH - 20, "S")

  doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.setLineWidth(1.2)
  doc.rect(13, 13, pageW - 26, pageH - 26, "S")

  let y = 35

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.text("IQ-EARNERS ELITE ARENA", pageW / 2, y - 5, { align: "center", charSpace: 1.5 })

  doc.setFontSize(42)
  doc.setTextColor(255, 255, 255)
  doc.text("CERTIFICATE", pageW / 2, y + 10, { align: "center" })

  y += 20
  doc.setFontSize(16)
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2])
  const subTitle = `OF ${theme.label} EXCELLENCE`
  doc.text(subTitle.toUpperCase(), pageW / 2, y, { align: "center", charSpace: 2 })

  y += 30
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(180, 180, 180)
  doc.text("PROUDLY PRESENTED TO", pageW / 2, y, { align: "center" })

  y += 18
  doc.setFont("helvetica", "bold")
  doc.setFontSize(32)
  doc.setTextColor(255, 255, 255)
  doc.text((recipientName || "Valued Participant").toUpperCase(), pageW / 2, y, { align: "center" })

  y += 6
  doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.setLineWidth(0.8)
  doc.line(pageW / 2 - 50, y, pageW / 2 + 50, y)

  y += 20
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor(200, 200, 200)
  const achievementText = `For achieving the distinguished ${theme.label} position with stellar performance in`
  doc.text(achievementText, pageW / 2, y, { align: "center" })

  y += 10
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(tournamentName.toUpperCase(), pageW / 2, y, { align: "center" })

  if (score > 0 || total > 0) {
    y += 12
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2])
    doc.text(`Aggregate Score: ${score} / ${total}`, pageW / 2, y, { align: "center" })
  }

  const footerY = pageH - 45

  const sealX = pageW / 2
  const sealY = footerY - 5
  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.circle(sealX, sealY, 16, "F")
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.circle(sealX, sealY, 13, "F")

  doc.setFont("helvetica", "black")
  doc.setFontSize(8)
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.text("OFFICIAL SEAL", sealX, sealY - 6, { align: "center" })
  doc.setFontSize(10)
  doc.text("IQ-EARNERS", sealX, sealY + 1, { align: "center" })
  doc.setFontSize(7)
  doc.text("VERIFIED", sealX, sealY + 6, { align: "center" })

  doc.setFont("times", "italic")
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text("Team IQ Earners", 50, footerY + 5, { align: "center" })

  // Premium trust marks for high-value certificate authenticity.
  drawIqEarnersStamp(doc, pageW / 2 - 38, footerY - 4, "EXCELLENCE", [198, 166, 89])
  drawIqEarnersStamp(doc, pageW / 2 + 38, footerY - 4, "TRUSTED", [130, 180, 255])

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(25, footerY + 8, 75, footerY + 8)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text("AUTHORIZED VERIFIER", 50, footerY + 13, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text(date, pageW - 50, footerY + 5, { align: "center" })

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(pageW - 75, footerY + 8, pageW - 25, footerY + 8)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text("DATE OF ISSUE", pageW - 50, footerY + 13, { align: "center" })

  const verificationId =
    memberId ||
    (recipientName.slice(0, 3) + tournamentName.slice(0, 3) + date.replace(/[^0-9]/g, "")).toUpperCase()
  const verifyUrl = `${brandUrl.replace(/\/$/, "")}/verify/${verificationId}`

  try {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`
    const qrRes = await fetch(qrApiUrl)
    const qrBlob = await qrRes.blob()
    const qrBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(qrBlob)
    })
    doc.addImage(qrBase64, "PNG", pageW - 35, pageH - 35, 20, 20)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(6)
    doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2])
    doc.text("VERIFY ORIGINAL", pageW - 25, pageH - 12, { align: "center" })
  } catch (err) {
    console.error("Failed to add QR code to certificate", err)
  }

  doc.setFontSize(7)
  doc.setTextColor(80, 80, 80)
  doc.text(`VERIFICATION ID: ${verificationId}`, pageW / 2, pageH - 12, { align: "center" })
  doc.text(brandUrl.replace(/^https?:\/\//, ""), pageW / 2, pageH - 8, { align: "center" })

  const safeName = (recipientName || "User").replace(/[^a-zA-Z0-9-]/g, "_")
  doc.save(`IQ-Earners-Certificate-${safeName}.pdf`)
}

export function generate1stPlaceCertificate(options: {
  recipientName: string
  tournamentName: string
  score?: number
  total?: number
  date?: string
  templateImageBase64?: string
  memberId?: string
}) {
  return generateCertificate({ ...options, type: "1st" })
}
