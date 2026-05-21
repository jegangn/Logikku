import type { ReactNode } from 'react'

// Supported subset for in-repo onboarding content: paragraphs, `-` bullet
// lists, **bold**, *italic*, `code`. No nesting, no literal * inside a span,
// no multi-level lists — unsupported syntax falls through as plain text.

interface MarkdownProps {
  readonly source: string
  readonly className?: string
}

interface Block {
  readonly kind: 'p' | 'ul'
  readonly lines: ReadonlyArray<string>
}

const INLINE_TOKEN = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/

function parseBlocks(src: string): ReadonlyArray<Block> {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let current: { kind: 'p' | 'ul'; lines: string[] } | null = null

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line === '') {
      if (current) {
        blocks.push(current)
        current = null
      }
      continue
    }
    const isBullet = /^\s*-\s+/.test(line)
    const kind: 'p' | 'ul' = isBullet ? 'ul' : 'p'
    if (!current || current.kind !== kind) {
      if (current) blocks.push(current)
      current = { kind, lines: [] }
    }
    current.lines.push(isBullet ? line.replace(/^\s*-\s+/, '') : line)
  }
  if (current) blocks.push(current)
  return blocks
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Tokenize: split on `code`, then **bold**, then *italic*. Order matters
  // because code spans should preserve their content verbatim.
  const out: ReactNode[] = []
  let remainder = text
  let i = 0

  while (remainder.length > 0) {
    const match = remainder.match(INLINE_TOKEN)
    if (!match || match.index === undefined) {
      out.push(remainder)
      break
    }
    if (match.index > 0) {
      out.push(remainder.slice(0, match.index))
    }
    const token = match[0]
    const key = `${keyPrefix}-${i++}`
    if (token.startsWith('**')) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      out.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    remainder = remainder.slice(match.index + token.length)
  }
  return out
}

export function Markdown({ source, className }: MarkdownProps) {
  const blocks = parseBlocks(source)
  return (
    <div className={className} data-testid="markdown">
      {blocks.map((block, bi) => {
        if (block.kind === 'p') {
          return (
            <p key={`p-${bi}`} className="mb-2 last:mb-0">
              {renderInline(block.lines.join(' '), `p-${bi}-i`)}
            </p>
          )
        }
        return (
          <ul key={`ul-${bi}`} className="mb-2 last:mb-0 list-disc pl-5 space-y-1">
            {block.lines.map((line, li) => (
              <li key={`ul-${bi}-${li}`}>
                {renderInline(line, `ul-${bi}-${li}-i`)}
              </li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}
