import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Home } from '@/ui/pages/Home'
import { Play } from '@/ui/pages/Play'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
      </Routes>
    </BrowserRouter>
  )
}
