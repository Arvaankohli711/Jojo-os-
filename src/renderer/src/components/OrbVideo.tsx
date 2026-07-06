import orb from '../assets/orb.mp4'
import type { CoreState } from './AICore'

interface Props {
  size?: number
  state?: CoreState
}

// Higgsfield-generated orb (looping video). It rotates continuously (CSS spin on
// the video) at all times, and only expands/pulses while Jojo is talking.
// ponytail: spin on the <video>, scale-pulse on the container — different
// elements so the two transforms never fight.
function OrbVideo({ size = 260, state = 'idle' }: Props): React.JSX.Element {
  return (
    <div className="orb-video" data-state={state} style={{ width: size, height: size }}>
      <video src={orb} autoPlay loop muted playsInline />
    </div>
  )
}

export default OrbVideo
