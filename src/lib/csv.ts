type Cell = string | number | null

/** Downloads rows as CSV. Text cells starting with = + - @ are prefixed to block spreadsheet formula injection. */
export function downloadCsv(filename: string, rows: Cell[][]) {
  const esc = (v: Cell) => {
    if (v == null) return ''
    let s = String(v)
    if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
