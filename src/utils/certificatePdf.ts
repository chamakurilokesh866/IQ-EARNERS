export type CertificateType = "1st" | "runner_up" | "participation"

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
}) {
  if (typeof window === "undefined") return

  // Dynamically import jsPDF to keep main bundle small
  const { jsPDF } = await import("jspdf")

  const doc = new jsPDF({
    orientation: "landscape", // Landscape is standard for certificates
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

  const hasTemplate = !!templateImageBase64
  const darkNavy = [15, 23, 42]
  const gold = [198, 166, 89]
  const slate600 = [71, 85, 105]

  // Theme Config
  const themes = {
    "1st": {
      primary: [234, 179, 8],      // Vivid Gold
      secondary: [254, 240, 138], // Light Gold
      label: "CHAMPION",
      badgeText: "1ST"
    },
    "runner_up": {
      primary: [148, 163, 184],    // Silver/Slate
      secondary: [241, 245, 249], // Very Light Slate
      label: "RUNNER UP",
      badgeText: "2ND"
    },
    "participation": {
      primary: [16, 185, 129],    // Vibrant Green
      secondary: [209, 250, 229], // Mint
      label: "PARTICIPANT",
      badgeText: "OK"
    }
  }
  const theme = themes[type] || themes["1st"]

  // --- Image Overlay Support ---
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

    // In template mode, we only add text to specific coordinates
    if (hasTemplate) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(22)
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
      doc.text(recipientName || "Valued Participant", pageW / 2, 105, { align: "center" })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      doc.setTextColor(slate600[0], slate600[1], slate600[2])
      doc.text(`${tournamentName} | ${date}`, pageW / 2, 116, { align: "center" })

      if (score > 0 || total > 0) {
        doc.text(`Score: ${score}/${total}`, pageW / 2, 124, { align: "center" })
      }

      const fileName = `IQE-Cert-${(recipientName || "user").replace(/\s+/g, "_")}.pdf`
      doc.save(fileName)
      return
    }
  }

  // --- Dynamic Premium Template (Full Design) ---

  // 1. Background
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.rect(0, 0, pageW, pageH, "F")

  // 2. Artistic Geometric Elements
  // Top-left corner
  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.triangle(0, 0, 70, 0, 0, 70, "F")
  doc.setFillColor(theme.secondary[0], theme.secondary[1], theme.secondary[2])
  doc.triangle(0, 0, 45, 0, 0, 45, "F")

  // Bottom-right corner
  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.triangle(pageW, pageH, pageW - 70, pageH, pageW, pageH - 70, "F")
  doc.setFillColor(theme.secondary[0], theme.secondary[1], theme.secondary[2])
  doc.triangle(pageW, pageH, pageW - 45, pageH, pageW, pageH - 45, "F")

  // 3. Dual Borders
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.3)
  doc.rect(10, 10, pageW - 20, pageH - 20, "S")

  doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.setLineWidth(1.2)
  doc.rect(13, 13, pageW - 26, pageH - 26, "S")

  let y = 35

  // 4. Branding & Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(38)
  doc.setTextColor(255, 255, 255)
  doc.text("CERTIFICATE", pageW / 2, y, { align: "center" })

  y += 10
  doc.setFontSize(14)
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2])
  const subTitle = (type === "participation" ? "OF PARTICIPATION" : "OF EXCELLENCE")
  doc.text(subTitle, pageW / 2, y, { align: "center", charSpace: 2 })

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

  // Elegant Accent Line
  y += 6
  doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.setLineWidth(0.8)
  doc.line(pageW / 2 - 50, y, pageW / 2 + 50, y)

  y += 20
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor(200, 200, 200)
  const achievementText = type === "participation"
    ? "For successfully competing and showcasing outstanding skill in"
    : `For achieving the ${theme.label} position with stellar performance in`
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

  // 5. Verification Section
  const footerY = pageH - 45

  // Seal / Badge
  const sealX = pageW / 2
  const sealY = footerY - 5
  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.circle(sealX, sealY, 16, "F")
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.circle(sealX, sealY, 13, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2])
  doc.text("IQ", sealX, sealY - 1, { align: "center" })
  doc.text("EARNERS", sealX, sealY + 3, { align: "center" })

  // Signature
  doc.setFont("times", "italic")
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text("Team IQ Earners", 50, footerY + 5, { align: "center" })

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(25, footerY + 8, 75, footerY + 8)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text("AUTHORIZED VERIFIER", 50, footerY + 13, { align: "center" })

  // Date
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

  // 6. Verification ID & QR Code
  const verificationId = memberId || (recipientName.slice(0, 3) + tournamentName.slice(0, 3) + date.replace(/[^0-9]/g, "")).toUpperCase()
  const verifyUrl = `https://www.iqearners.online/verify/${verificationId}`
  
  // Fetch QR Code from API
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
  doc.text(`www.iqearners.online`, pageW / 2, pageH - 8, { align: "center" })

  // 7. Save
  const safeName = (recipientName || "User").replace(/[^a-zA-Z0-9-]/g, "_")
  doc.save(`IQ-Earners-Certificate-${safeName}.pdf`)
}

export function generate1stPlaceCertificate(options: {
  recipientName: string;
  tournamentName: string;
  score?: number;
  total?: number;
  date?: string;
  templateImageBase64?: string;
  memberId?: string;
}) {
  return generateCertificate({ ...options, type: "1st" })
}
