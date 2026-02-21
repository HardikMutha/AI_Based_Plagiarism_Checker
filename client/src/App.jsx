import { Routes, Route, Outlet, Navigate } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import DashboardPage from "./pages/DashboardPage"
import BatchScanPage from "./pages/BatchScanPage"
import AICheckPage from "./pages/AICheckPage"
import CitationPage from "./pages/CitationPage"
import ReportHistoryPage from "./pages/ReportHistoryPage"
import ReportViewPage from "./pages/ReportViewPage"
import PDFAnalysisPage from "./pages/PDFAnalysisPage"
import AssignmentsPage from "./pages/AssignmentsPage"
import AssignmentDetailPage from "./pages/AssignmentDetailPage"
import ProtectedRoute from "./components/ProtectedRoute"
import { SidebarProvider } from "./components/ui/sidebar"
import { AppSidebar } from "./components/app-sidebar"
import { Toaster } from "./components/ui/sonner"
import { useAuth } from "./context/AuthContext"

const ProtectedDashboardLayout = () => {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 w-full relative h-[100dvh] overflow-y-auto bg-transparent">
          <Outlet />
        </main>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

const GuestGuard = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        } />

        <Route path="/signup" element={
          <GuestGuard>
            <SignupPage />
          </GuestGuard>
        } />

        <Route element={<ProtectedDashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/compare" element={<DashboardPage />} />
          <Route path="/ai-check" element={<AICheckPage />} />
          <Route path="/batch-scan" element={<BatchScanPage />} />
          <Route path="/citations" element={<CitationPage />} />
          <Route path="/pdf-analysis" element={<PDFAnalysisPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
          <Route path="/reports" element={<ReportHistoryPage />} />
          <Route path="/reports/:id" element={<ReportViewPage />} />
          <Route path="/settings" element={<DashboardPage />} />
        </Route>

        <Route path="/about" element={<h1 className="text-3xl font-bold font-mono p-8">About Page</h1>} />
        <Route path="*" element={<h1 className="text-3xl font-bold p-8">404 Not Found</h1>} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
