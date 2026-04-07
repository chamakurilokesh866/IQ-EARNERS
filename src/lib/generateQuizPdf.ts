export type QuizReportRow = {
  question: string
  correctAnswer: string
  userAnswer: string
  correct: boolean
  timeSeconds: number
  explanation?: string
}

const SITE_NAME = "IQ Earners"

const PDF_LABELS: Record<string, { reportTitle: string; player: string; scoreTime: string; allQandA: string; correct: string; yourAnswer: string; timeTaken: string; explanation: string }> = {
  en: { reportTitle: "Quiz Report", player: "Player", scoreTime: "correct • Total time", allQandA: "All questions & answers", correct: "Correct", yourAnswer: "Your answer", timeTaken: "Time taken", explanation: "Explanation" },
  hi: { reportTitle: "क्विज़ रिपोर्ट", player: "खिलाड़ी", scoreTime: "सही • कुल समय", allQandA: "सभी प्रश्न और उत्तर", correct: "सही उत्तर", yourAnswer: "आपका उत्तर", timeTaken: "लिया गया समय", explanation: "व्याख्या" },
  es: { reportTitle: "Informe del quiz", player: "Jugador", scoreTime: "correctas • Tiempo total", allQandA: "Todas las preguntas y respuestas", correct: "Correcta", yourAnswer: "Tu respuesta", timeTaken: "Tiempo", explanation: "Explicación" },
  mr: { reportTitle: "क्विज अहवाल", player: "खेळाडू", scoreTime: "बरोबर • एकूण वेळ", allQandA: "सर्व प्रश्न आणि उत्तरे", correct: "बरोबर उत्तर", yourAnswer: "तुमचे उत्तर", timeTaken: "घेतलेला वेळ", explanation: "स्पष्टीकरण" },
  ta: { reportTitle: "வினாடி வினா அறிக்கை", player: "வீரர்", scoreTime: "சரி • மொத்த நேரம்", allQandA: "அனைத்து கேள்விகள் மற்றும் பதில்கள்", correct: "சரியான பதில்", yourAnswer: "உங்கள் பதில்", timeTaken: "எடுத்த நேரம்", explanation: "விளக்கம்" },
  te: { reportTitle: "క్విజ్ నివేదిక", player: "క్రీడాకారుడు", scoreTime: "సరైనవి • మొత్తం సమయం", allQandA: "అన్ని ప్రశ్నలు మరియు సమాధానాలు", correct: "సరైన సమాధానం", yourAnswer: "మీ సమాధానం", timeTaken: "తీసుకున్న సమయం", explanation: "వివరణ" },
}

function getPdfLabels(lang: string) {
  return PDF_LABELS[lang] ?? PDF_LABELS.en
}

/** Simple paper: IQ Earners heading only, plain fonts, no extra styling. */
export function generateQuizPdf(
  rows: QuizReportRow[],
  correct: number,
  total: number,
  totalTimeSeconds: number,
  username: string,
  language: string = "en",
  simplePaper: boolean = true
): void {
  if (typeof window === "undefined") return
  const L = getPdfLabels(language)

  // Use html2canvas to render a hidden element with proper fonts, then put into jsPDF
  Promise.all([
    import("jspdf"),
    import("html2canvas")
  ]).then(([{ jsPDF }, { default: html2canvas }]) => {
    const container = document.createElement("div")
    container.style.position = "fixed"
    container.style.left = "-9999px"
    container.style.top = "0"
    container.style.width = "800px" // A4-ish width
    container.style.backgroundColor = "white"
    container.style.color = "black"
    container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif"
    container.style.padding = "40px"

    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; margin: 0; color: #7c3aed;">${SITE_NAME}</h1>
        <h2 style="font-size: 18px; margin: 10px 0 0 0; color: #666;">${L.reportTitle}</h2>
      </div>
      <div style="margin-bottom: 25px; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
        <p><strong>${L.player}:</strong> ${username || "Guest"}</p>
        <p><strong>Score:</strong> ${correct} / ${total} (${Math.round(correct / total * 100)}%)</p>
        <p><strong>${L.timeTaken}:</strong> ${totalTimeSeconds}s</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 20px;">
    `

    rows.forEach((r, i) => {
      html += `
        <div style="page-break-inside: avoid; border-left: 4px solid ${r.correct ? "#10b981" : "#ef4444"}; padding-left: 15px; margin-bottom: 15px;">
          <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 15px;">Q${i + 1}: ${r.question}</p>
          <p style="margin: 5px 0; font-size: 13px;"><strong>${L.correct}:</strong> ${r.correctAnswer}</p>
          <p style="margin: 5px 0; font-size: 13px;"><strong>${L.yourAnswer}:</strong> ${r.userAnswer} ${r.correct ? "✓" : "✗"}</p>
          ${r.explanation ? `<p style="margin: 8px 0 0 0; font-size: 12px; font-style: italic; color: #555;"><strong>${L.explanation}:</strong> ${r.explanation}</p>` : ""}
        </div>
      `
    })

    html += `</div>`
    container.innerHTML = html
    document.body.appendChild(container)

    html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "white"
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/jpeg", 0.95)
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 10

      pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`quiz-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      document.body.removeChild(container)
    })
  })
}
