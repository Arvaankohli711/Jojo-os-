import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

// Real GitHub-release download total (summed from the release assets' download
// counts, fetched in main). Shows "not published yet" until the repo has a
// release — never a fabricated number.
function DownloadCounter(): React.JSX.Element {
  const [n, setN] = useState<number | null | 'loading'>('loading')

  useEffect(() => {
    window.jojo.getDownloads().then(setN).catch(() => setN(null))
  }, [])

  return (
    <div className="dl-counter">
      <Download size={15} />
      {n === 'loading' ? (
        <span className="dim">checking downloads…</span>
      ) : n === null ? (
        <span className="dim">Downloads: not published yet</span>
      ) : (
        <span>
          <b>{n.toLocaleString()}</b> downloads
        </span>
      )}
    </div>
  )
}

export default DownloadCounter
