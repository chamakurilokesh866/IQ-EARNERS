/**
 * Delete .next folder before build. Avoids Next.js recursive-delete readlink
 * issues on Windows with OneDrive. Run this before next build.
 */
const fs = require("fs")
const path = require("path")

const nextDir = path.join(process.cwd(), ".next")

try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 2 })
  }
} catch {
  // Ignore - next build may still succeed
}
