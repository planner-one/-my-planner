export interface QuickMemoListEdit {
  value: string
  cursor: number
}

export type QuickMemoBlock =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'unordered'; items: string[] }
  | { type: 'ordered'; items: Array<{ number: number; text: string }> }

const unorderedPattern = /^(\s*)-\s(.*)$/
const orderedPattern = /^(\s*)(\d+)\.\s(.*)$/

export function getQuickMemoListEdit(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): QuickMemoListEdit | null {
  if (selectionStart !== selectionEnd) return null

  const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1
  const nextNewline = value.indexOf('\n', selectionStart)
  const lineEnd = nextNewline === -1 ? value.length : nextNewline
  const line = value.slice(lineStart, lineEnd)
  const unordered = line.match(unorderedPattern)
  const ordered = line.match(orderedPattern)
  const match = unordered ?? ordered

  if (!match) return null

  const itemText = match[match.length - 1]
  if (!itemText.trim()) {
    const nextValue = `${value.slice(0, lineStart)}${value.slice(lineEnd)}`
    return { value: nextValue, cursor: lineStart }
  }

  const prefix = unordered
    ? `${unordered[1]}- `
    : `${ordered![1]}${Number(ordered![2]) + 1}. `
  const nextValue = `${value.slice(0, selectionStart)}\n${prefix}${value.slice(selectionEnd)}`

  return {
    value: nextValue,
    cursor: selectionStart + prefix.length + 1,
  }
}

export function parseQuickMemoContent(content: string): QuickMemoBlock[] {
  const blocks: QuickMemoBlock[] = []

  content.split(/\r?\n/).forEach(line => {
    const unordered = line.match(unorderedPattern)
    if (unordered) {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'unordered') {
        last.items.push(unordered[2])
      } else {
        blocks.push({ type: 'unordered', items: [unordered[2]] })
      }
      return
    }

    const ordered = line.match(orderedPattern)
    if (ordered) {
      const item = { number: Number(ordered[2]), text: ordered[3] }
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ordered') {
        last.items.push(item)
      } else {
        blocks.push({ type: 'ordered', items: [item] })
      }
      return
    }

    const last = blocks[blocks.length - 1]
    if (last?.type === 'paragraph') {
      last.lines.push(line)
    } else {
      blocks.push({ type: 'paragraph', lines: [line] })
    }
  })

  return blocks
}
