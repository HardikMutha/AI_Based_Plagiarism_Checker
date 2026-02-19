import { Routes, Route } from "react-router-dom"
import LandingPage from "./pages/LandingPage"

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<h1 className="text-3xl font-bold font-mono">About Page</h1>} />
        <Route path="*" element={<h1 className="text-3xl font-bold">404 Not Found</h1>} />
      </Routes>
    </>
  )
}

export default App
