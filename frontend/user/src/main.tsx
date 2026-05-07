import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'

// NOTE: React.StrictMode is intentionally disabled.
// VideoSDK's MeetingProvider mounts → cleans up → re-mounts under StrictMode
// in dev, which caused duplicate participants (each user appearing 2–4 times)
// and aborted getUserMedia calls that left the camera black. Production builds
// never exhibit StrictMode, so behavior is unaffected there.
createRoot(document.getElementById('root')!).render(<App />)
