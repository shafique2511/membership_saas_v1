import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { CustomerPortalLayout } from '@/components/layout/CustomerPortalLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { BusinessDashboardPage } from '@/pages/business/BusinessDashboardPage'
import { UpgradePage } from '@/pages/business/UpgradePage'
import { CustomerHomePage } from '@/pages/customer/CustomerHomePage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

const businessPages = [
  ['bookings', 'Booking module', 'Calendar, resources, services, deposits, approvals, and walk-ins.'],
  ['memberships', 'Membership module', 'Plans, member cards, renewals, credits, visits, and discounts.'],
  ['loyalty', 'Loyalty module', 'Points, rewards, vouchers, birthday rewards, and referrals.'],
  ['pos', 'POS module', 'Checkout for products, services, memberships, split payments, and receipts.'],
  ['inventory', 'Inventory module', 'Stock, suppliers, transfers, low-stock alerts, and branch inventory.'],
  ['staff', 'Staff module', 'Schedules, assigned services, performance, and commission setup.'],
  ['payments', 'Payment module', 'Invoices, receipts, proofs, refunds, partial payments, and gateway-ready records.'],
  ['reports', 'Reports module', 'Sales, booking, membership, loyalty, staff, inventory, and payment reporting.'],
  ['marketing', 'Marketing module', 'Campaigns, promos, segments, broadcasts, and referral campaigns.'],
  ['branches', 'Multi-branch module', 'Branch staff, bookings, sales, inventory, transfers, and comparisons.'],
  ['settings', 'Settings', 'Business profile, booking rules, billing plan, security, and module settings.'],
] as const

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/business" replace />} />
        <Route path="auth" element={<AuthLayout />}>
          <Route index element={<Navigate to="/auth/login" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="*" element={<PlaceholderPage title="Admin page" description="Super admin workspace scaffold." />} />
        </Route>
        <Route path="business" element={<DashboardLayout />}>
          <Route index element={<BusinessDashboardPage />} />
          <Route path="upgrade" element={<UpgradePage />} />
          {businessPages.map(([path, title, description]) => (
            <Route key={path} path={path} element={<PlaceholderPage title={title} description={description} />} />
          ))}
        </Route>
        <Route path="customer" element={<CustomerPortalLayout />}>
          <Route index element={<CustomerHomePage />} />
          <Route
            path="*"
            element={<PlaceholderPage title="Customer portal" description="Mobile-first customer pages are scaffolded." />}
          />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
