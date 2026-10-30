import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import About from './pages/About'
import Contact from './pages/Contact'
import Cookies from './pages/Cookies'
import DataProtection from './pages/DataProtection'
import Documentation from './pages/Documentation'
import Community from './pages/Community'
import HelpCenter from './pages/HelpCenter'
import Firmware from './pages/Firmware'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import PersonalDashboardLayout from './layouts/PersonalDashboardLayout'
import OverviewTab from './pages/PersonalDashboard/OverviewTab'
import MyDevicesTab from './pages/PersonalDashboard/MyDevicesTab'
import AuthenticationTab from './pages/PersonalDashboard/AuthenticationTab'
import DeviceControlTab from './pages/PersonalDashboard/DeviceControlTab'
import SecurityAlertsTab from './pages/PersonalDashboard/SecurityAlertsTab'
import ScrollToTop from './components/ScrollToTop'
import './App.css'

function App() {
  const location = useLocation()

  return (
    <>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/data-protection" element={<DataProtection />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/community" element={<Community />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/firmware" element={<Firmware />} />

          {/* Personal Dashboard with its own Sub-Layout and Tabs (un-nested from original DashboardLayout) */}
          <Route path="/dashboard/personal" element={<PersonalDashboardLayout />}>
            <Route index element={<OverviewTab />} />
            <Route path="devices" element={<MyDevicesTab />} />
            <Route path="authentication" element={<AuthenticationTab />} />
            <Route path="control" element={<DeviceControlTab />} />
            <Route path="alerts" element={<SecurityAlertsTab />} />
          </Route>

          {/* Protected Dashboard Routes (Business/Admin) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />

            {/* Account Specific Dashboards */}
            <Route path="business" element={<Dashboard />} />

            {/* Placeholders for now */}
            <Route path="security" element={<Dashboard />} />
            <Route path="network" element={<Dashboard />} />
            <Route path="settings" element={<Dashboard />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default App

