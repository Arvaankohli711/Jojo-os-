import type { PageMeta } from './registry'

interface Props {
  meta: PageMeta
}

function Placeholder({ meta }: Props): React.JSX.Element {
  return (
    <div className="placeholder">
      <div className="panel placeholder-panel">
        <span className="phase-badge">{meta.phase}</span>
        <h2>{meta.title}</h2>
        <p>{meta.description}</p>
        <div className="placeholder-grid" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} className="placeholder-cell" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Placeholder
