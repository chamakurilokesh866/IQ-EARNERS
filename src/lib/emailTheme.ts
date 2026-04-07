/**
 * IQ Earners Standard Email Theme
 * Provides high-quality, animated (where supported), and responsive HTML templates.
 */

interface ThemeOptions {
  title: string;
  subtitle: string;
  content: string;
  highlightContent?: string;
  /** Replaces default "Verification Code" above the highlight box */
  highlightLabel?: string;
  footerText?: string;
  buttonLink?: string;
  buttonText?: string;
  rawHtml?: string;
  theme?: "modern" | "paper" | "vintage" | "celebration";
}

export function getEmailTemplate(options: ThemeOptions) {
  const {
    title,
    subtitle,
    content,
    highlightContent,
    highlightLabel,
    footerText,
    buttonLink,
    buttonText,
    rawHtml,
    theme = "modern"
  } = options;
  const year = new Date().getFullYear();

  // Theme-specific styles
  const isPaper = theme === "paper";
  const isVintage = theme === "vintage";
  const isCelebration = theme === "celebration";

  const styles = {
    bodyBg: isPaper ? "#f0f2f5" : isVintage ? "#2d241e" : "#030712",
    containerBg: isPaper ? "#ffffff" : isVintage ? "#e6d5b8" : isCelebration ? "#0f172a" : "#0d1117",
    textColor: isPaper ? "#1f2937" : isVintage ? "#433422" : "#f8fafc",
    mutedText: isPaper ? "#6b7280" : isVintage ? "#6d5b46" : "#94a3b8",
    headerBg: isPaper
      ? "#ffffff"
      : isVintage
        ? "#d9c5a3"
        : isCelebration
          ? "linear-gradient(125deg, #0e7490 0%, #2563eb 35%, #7c3aed 100%)"
          : "linear-gradient(135deg, #7c3aed 0%, #1e293b 100%)",
    headerText: isPaper ? "#7c3aed" : isVintage ? "#433422" : "#ffffff",
    highlightBg: isPaper ? "#f9fafb" : isVintage ? "#f1e4d1" : isCelebration ? "linear-gradient(145deg, rgba(34,211,238,0.12) 0%, rgba(99,102,241,0.08) 100%)" : "rgba(255, 255, 255, 0.03)",
    highlightBorder: isPaper
      ? "2px dashed #e5e7eb"
      : isVintage
        ? "2px solid #c4b095"
        : isCelebration
          ? "2px solid rgba(34, 211, 238, 0.45)"
          : "1px solid rgba(255, 255, 255, 0.1)",
    btnBg: isPaper ? "#7c3aed" : isVintage ? "#8b6e4b" : "linear-gradient(92deg, #22d3ee, #3b82f6, #a855f7, #22d3ee)",
    btnText: isPaper ? "#ffffff" : isVintage ? "#ffffff" : "#020617",
    footerBg: isPaper ? "#f9fafb" : isVintage ? "#d9c5a3" : isCelebration ? "#020617" : "#090c10",
    accent: isPaper ? "#7c3aed" : isVintage ? "#8b6e4b" : isCelebration ? "#22d3ee" : "#38bdf8"
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=JetBrains+Mono:wght@700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');

body {
  margin: 0;
  padding: 0;
  background-color: ${styles.bodyBg};
  font-family: ${isVintage ? "'Libre Baskerville', serif" : "'Outfit', sans-serif"};
  color: ${styles.textColor};
}
${isCelebration ? `
@keyframes celebrateGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.35), 0 0 40px rgba(59, 130, 246, 0.15); }
  50% { box-shadow: 0 0 0 6px rgba(34, 211, 238, 0.12), 0 0 56px rgba(99, 102, 241, 0.22); }
}
@keyframes shimmerBtn {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
` : ""}

.outer-container {
  background-color: ${styles.bodyBg};
  padding: 40px 20px;
}

.container {
  max-width: 580px;
  margin: 0 auto;
  background-color: ${styles.containerBg};
  ${!isPaper && !isVintage ? `border: 1px solid ${isCelebration ? "rgba(34,211,238,0.2)" : "#30363d"};` : ""}
  border-radius: ${isVintage ? "4px" : "24px"};
  overflow: hidden;
  box-shadow: ${isPaper ? "0 10px 25px rgba(0,0,0,0.05)" : isVintage ? "0 15px 40px rgba(0,0,0,0.4), inset 0 0 100px rgba(0,0,0,0.05)" : isCelebration ? "0 32px 64px rgba(0,0,0,0.65), 0 0 80px rgba(34,211,238,0.08)" : "0 30px 60px rgba(0,0,0,0.5)"};
  ${isVintage ? "border: 1px solid #c4b095;" : ""}
}

.header {
  background: ${styles.headerBg};
  padding: ${isVintage ? "60px 40px" : "48px 40px"};
  text-align: center;
  ${isVintage ? "border-bottom: 2px solid rgba(67, 52, 34, 0.1);" : ""}
}

.header-logo {
  font-size: 32px;
  font-weight: 800;
  color: ${styles.headerText};
  letter-spacing: -1px;
  margin: 0;
  text-transform: lowercase;
}

.header-logo span { color: ${styles.accent}; }

.content {
  padding: 40px;
  text-align: left;
}

.content h2 {
  margin: 0 0 16px;
  font-size: 28px;
  font-weight: 800;
  color: ${styles.textColor};
  letter-spacing: -0.5px;
  text-align: center;
}

.content p {
  margin: 0 0 24px;
  font-size: 16px;
  line-height: 1.8;
  color: ${styles.mutedText};
}

.highlight-container {
  padding: 32px;
  background-color: ${styles.highlightBg};
  border: ${styles.highlightBorder};
  border-radius: ${isVintage ? "4px" : "20px"};
  margin: 40px 0;
  text-align: center;
  ${isVintage ? "box-shadow: inset 0 0 20px rgba(0,0,0,0.02);" : ""}
}

.highlight-label {
  font-size: 11px;
  font-weight: 700;
  color: ${styles.accent};
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 12px;
  display: block;
}

.highlight-text {
  font-size: ${isCelebration ? "36px" : "42px"};
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: ${isCelebration ? "0.06em" : "8px"};
  color: ${isVintage ? "#433422" : isPaper ? "#000000" : "#e0f2fe"};
  margin: 0;
  word-break: break-word;
  ${isCelebration ? "animation: celebrateGlow 3s ease-in-out infinite;" : ""}
}

.btn-container { text-align: center; margin-top: 30px; }

.btn {
  display: inline-block;
  padding: 18px 42px;
  background: ${styles.btnBg};
  background-size: ${isCelebration ? "200% auto" : "100% 100%"};
  color: ${styles.btnText} !important;
  text-decoration: none !important;
  font-weight: 700;
  border-radius: ${isVintage ? "4px" : "14px"};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-size: 14px;
  ${isCelebration ? "animation: shimmerBtn 4s linear infinite;" : ""}
}

.footer {
  padding: 32px 40px;
  background-color: ${styles.footerBg};
  text-align: center;
  ${!isPaper && !isVintage ? `border-top: 1px solid ${isCelebration ? "rgba(34,211,238,0.15)" : "#30363d"};` : isVintage ? "border-top: 1px solid rgba(67, 52, 34, 0.1);" : "border-top: 1px solid #f3f4f6;"}
}

.footer p {
  margin: 8px 0;
  font-size: 11px;
  color: ${styles.mutedText};
  font-weight: 500;
}

.social-links { margin-top: 24px; }
.social-links a { color: ${styles.accent}; margin: 0 12px; font-size: 10px; text-decoration: none; font-weight: 700; letter-spacing: 1px; }

/* Vintage "folded" paper effect */
${isVintage ? `
.vintage-texture {
  position: relative;
}
.vintage-texture:before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: url('https://www.transparenttextures.com/patterns/aged-paper.png');
  pointer-events: none;
  opacity: 0.3;
}
` : ""}
</style>
</head>

<body class="${isVintage ? "vintage-texture" : ""}">
  <div class="outer-container">
    <div class="container">
      <div class="header">
        <h1 class="header-logo">iq<span>earners</span></h1>
      </div>

      <div class="content">
        ${rawHtml ? rawHtml : `
          <h2>${subtitle}</h2>
          <p>${content}</p>

          ${highlightContent ? `
            <div class="highlight-container">
              <span class="highlight-label">${highlightLabel || "Verification Code"}</span>
              <p class="highlight-text">${highlightContent}</p>
            </div>
          ` : ""}

          ${buttonLink ? `
            <div class="btn-container">
              <a href="${buttonLink}" class="btn">${buttonText || "Access Portal"}</a>
            </div>
          ` : ""}
        `}
      </div>

      <div class="footer">
        <p>${footerText || "This is a secure automated transmission."}</p>
        <p>&copy; ${year} ${title}. Premium Gamified Learning Platform.</p>
        <div class="social-links">
          <a href="#">DASHBOARD</a>
          <a href="#">SUPPORT</a>
          <a href="#">PRIVACY</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
}
