import { Navigate, Route, Routes } from 'react-router-dom'
import { ModuleRoute } from '@/components/auth/ModuleRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { CustomerPortalLayout } from '@/components/layout/CustomerPortalLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage'
import { CustomerRegisterPage } from '@/pages/auth/CustomerRegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { BusinessDashboardPage } from '@/pages/business/BusinessDashboardPage'
import { UpgradePage } from '@/pages/business/UpgradePage'
import { CustomerHomePage } from '@/pages/customer/CustomerHomePage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

import type { ModuleKey } from '@/types'

const businessPages = [
  ['bookings', 'booking', 'Booking module', 'Calendar, resources, services, deposits, approvals, and walk-ins.'],
  ['memberships', 'membership', 'Membership module', 'Plans, member cards, renewals, credits, visits, and discounts.'],
  ['loyalty', 'loyalty', 'Loyalty module', 'Points, rewards, vouchers, birthday rewards, and referrals.'],
  ['pos', 'pos', 'POS module', 'Checkout for products, services, memberships, split payments, and receipts.'],
  ['inventory', 'inventory', 'Inventory module', 'Stock, suppliers, transfers, low-stock alerts, and branch inventory.'],
  ['staff', 'staff_commission', 'Staff module', 'Schedules, assigned services, performance, and commission setup.'],
  ['payments', 'payment', 'Payment module', 'Invoices, receipts, proofs, refunds, partial payments, and gateway-ready records.'],
  ['reports', 'reports', 'Reports module', 'Sales, booking, membership, loyalty, staff, inventory, and payment reporting.'],
  ['marketing', 'marketing', 'Marketing module', 'Campaigns, promos, segments, broadcasts, and referral campaigns.'],
  ['branches', 'multi_branch', 'Multi-branch module', 'Branch staff, bookings, sales, inventory, transfers, and comparisons.'],
  ['settings', 'core', 'Settings', 'Business profile, booking rules, billing plan, security, and module settings.'],
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
          <Route path="customer-register" element={<CustomerRegisterPage />} />
          <Route path="accept-invite" element={<AcceptInvitePage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="unauthorized" element={<UnauthorizedPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['super_admin']} />}>
          <Route path="admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="*" element={<PlaceholderPage title="Admin page" description="Super admin workspace scaffold." />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['owner', 'manager', 'staff', 'super_admin']} />}>
          <Route path="business" element={<DashboardLayout />}>
            <Route index element={<BusinessDashboardPage />} />
            <Route path="upgrade" element={<UpgradePage />} />
            {businessPages.map(([path, moduleKey, title, description]) => (
              <Route key={path} element={<ModuleRoute moduleKey={moduleKey as ModuleKey} moduleName={title} />}>
                <Route path={path} element={<PlaceholderPage title={title} description={description} />} />
              </Route>
            ))}
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['customer', 'super_admin']} />}>
          <Route path="customer" element={<CustomerPortalLayout />}>
            <Route element={<ModuleRoute moduleKey="customer_portal" moduleName="Customer Portal module" />}>
              <Route index element={<CustomerHomePage />} />
              <Route
                path="*"
                element={<PlaceholderPage title="Customer portal" description="Mobile-first customer pages are scaffolded." />}
              />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
