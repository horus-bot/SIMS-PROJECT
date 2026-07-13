import { Routes, Route } from "react-router-dom"
import Landing from "./pages/landing"
import Navigation from "./pages/navigation"
import MapView from "./pages/MapVIew"
import QRGenerator from "./pages/qrAdmin"
import Test from "./pages/test"
import BleTestingPage from "./pages/ble_testing" // <-- 1. Add this import
import BleTestingPageFixed from "./pages/ble_fixed" // <-- 1. Add this import


function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/navigation" element={<Navigation />} />
      <Route path="/map-view" element={<MapView />} />
      <Route path="/admin" element={<QRGenerator />} />
      <Route path="/test" element={<Test />} />
      <Route path="/ble-test" element={<BleTestingPage />} /> {/* <-- 2. Add this route */}
      <Route path="/ble-test-fixed" element={<BleTestingPageFixed />} />
    </Routes>
  )
}

export default App