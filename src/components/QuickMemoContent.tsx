import { parseQuickMemoContent } from '../utils/quickMemo'

interface QuickMemoContentProps {
  content: string
  compact?: boolean
}

export default function QuickMemoContent({ content, compact = false }: QuickMemoContentProps) {
  return (
    <div className={`quick-memo-content${compact ? ' is-compact' : ''}`}>
      {parseQuickMemoContent(content).map((block, blockIndex) => {
        if (block.type === 'unordered') {
          return (
            <ul key={blockIndex}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
            </ul>
          )
        }

        if (block.type === 'ordered') {
          return (
            <ol key={blockIndex} start={block.items[0]?.number}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} value={item.number}>{item.text}</li>
              ))}
            </ol>
          )
        }

        return (
          <p key={blockIndex}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {line || '\u00a0'}
                {lineIndex < block.lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}

      <style>{`
        .quick-memo-content {
          min-width: 0;
          color: inherit;
          font-size: inherit;
          line-height: inherit;
          overflow-wrap: anywhere;
        }
        .quick-memo-content p,
        .quick-memo-content ul,
        .quick-memo-content ol {
          margin: 0;
        }
        .quick-memo-content ul,
        .quick-memo-content ol {
          padding-left: 1.4em;
        }
        .quick-memo-content li + li {
          margin-top: 2px;
        }
        .quick-memo-content.is-compact {
          max-height: 3em;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
