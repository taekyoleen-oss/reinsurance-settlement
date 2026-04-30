import fs from 'node:fs'
import path from 'node:path'

const message = process.argv.slice(2).join(' ').trim()
if (!message) {
  console.error('사용법: pnpm run history:log -- <한 줄 요약>')
  process.exit(1)
}

const file = path.join(process.cwd(), 'history', 'HISTORY.md')
const stamp = new Date().toISOString()
const block = `\n## ${stamp}\n\n${message}\n`
fs.appendFileSync(file, block, 'utf8')
console.log(`history/HISTORY.md 에 기록했습니다: ${stamp}`)
