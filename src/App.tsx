import { Navigate, Route, Routes } from 'react-router-dom'
import { ModuleRoute } from '@/components/auth/ModuleRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { CustomerPortalLayout } from '@/components/layout/CustomerPortalLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AddOnsManagementPage } from '@/pages/admin/AddOnsManagementPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { BusinessDetailsPage } from '@/pages/admin/BusinessDetailsPage'
import { BusinessesPage } from '@/pages/admin/BusinessesPage'
import { ModuleManagementPage } from '@/pages/admin/ModuleManagementPage'
import { PackageManagementPage } from '@/pages/admin/PackageManagementPage'
import { PlatformSettingsPage } from '@/pages/admin/PlatformSettingsPage'
import { PlatformTablePage } from '@/pages/admin/PlatformTablePage'
import { SubscriptionsPage } from '@/pages/admin/SubscriptionsPage'
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage'
import { CustomerRegisterPage } from '@/pages/auth/CustomerRegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { BookingsPage } from '@/pages/business/BookingsPage'
import { BusinessDashboardPage } from '@/pages/business/BusinessDashboardPage'
import { CustomerMembershipsPage } from '@/pages/business/CustomerMembershipsPage'
import { MembershipDetailsPage } from '@/pages/business/MembershipDetailsPage'
import { MembershipPlansPage } from '@/pages/business/MembershipPlansPage'
import { BirthdayRewardsPage } from '@/pages/business/loyalty/BirthdayRewardsPage'
import { CustomerPointsPage } from '@/pages/business/loyalty/CustomerPointsPage'
import { LoyaltySettingsPage } from '@/pages/business/loyalty/LoyaltySettingsPage'
import { PointsHistoryPage } from '@/pages/business/loyalty/PointsHistoryPage'
import { ReferralRewardsPage } from '@/pages/business/loyalty/ReferralRewardsPage'
import { RewardsCatalogPage } from '@/pages/business/loyalty/RewardsCatalogPage'
import { POSCheckoutPage } from '@/pages/business/pos/POSCheckoutPage'
import { POSDailyClosingPage } from '@/pages/business/pos/POSDailyClosingPage'
import { POSOrderDetailsPage } from '@/pages/business/pos/POSOrderDetailsPage'
import { POSOrdersPage } from '@/pages/business/pos/POSOrdersPage'
import { POSReceiptsPage } from '@/pages/business/pos/POSReceiptsPage'
import { POSRefundsPage } from '@/pages/business/pos/POSRefundsPage'
import { InventoryReportPage } from '@/pages/business/inventory/InventoryReportPage'
import { LowStockAlertsPage } from '@/pages/business/inventory/LowStockAlertsPage'
import { ProductDetailsPage } from '@/pages/business/inventory/ProductDetailsPage'
import { ProductsPage } from '@/pages/business/inventory/ProductsPage'
import { StockAdjustmentPage, StockInPage, StockOutPage } from '@/pages/business/inventory/StockPages'
import { StockTransferPage } from '@/pages/business/inventory/StockTransferPage'
import { StaffListPage } from '@/pages/business/staff/StaffListPage'
import { StaffDetailsPage } from '@/pages/business/staff/StaffDetailsPage'
import { StaffSchedulePage } from '@/pages/business/staff/StaffSchedulePage'
import { StaffCalendarPage } from '@/pages/business/staff/StaffCalendarPage'
import { CommissionSettingsPage } from '@/pages/business/staff/CommissionSettingsPage'
import { CommissionReportPage } from '@/pages/business/staff/CommissionReportPage'
import { StaffPerformancePage } from '@/pages/business/staff/StaffPerformancePage'
import { BranchesPage } from '@/pages/business/BranchesPage'
import { PaymentsPage } from '@/pages/business/payments/PaymentsPage'
import { ReportsPage } from '@/pages/business/reports/ReportsPage'
import { MarketingPage } from '@/pages/business/marketing/MarketingPage'
import { BusinessSettingsPage } from '@/pages/business/settings/BusinessSettingsPage'
import { AddOnManagementPage } from '@/pages/business/AddOnManagementPage'
import { BusinessModuleAccessPage } from '@/pages/business/BusinessModuleAccessPage'
import { BusinessSubscriptionPage } from '@/pages/business/BusinessSubscriptionPage'
import { PackageComparisonPage } from '@/pages/business/PackageComparisonPage'
import { UpgradePage } from '@/pages/business/UpgradePage'
import { UsageLimitsPage } from '@/pages/business/UsageLimitsPage'
import { CustomerBookingPage } from '@/pages/customer/CustomerBookingPage'
import { CustomerHomePage } from '@/pages/customer/CustomerHomePage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

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
            <Route path="businesses" element={<BusinessesPage />} />
            <Route path="businesses/:businessId" element={<BusinessDetailsPage />} />
            <Route path="packages" element={<PackageManagementPage />} />
            <Route path="modules" element={<ModuleManagementPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="add-ons" element={<AddOnsManagementPage />} />
            <Route path="invoices" element={<PlatformTablePage table="billing_invoices" title="Billing invoices" description="Platform billing invoices, due dates, and paid status." showBusinessName />} />
            <Route path="payments" element={<PlatformTablePage table="payments" title="Payments" description="All tenant payment records and payment verification status." showBusinessName />} />
            <Route path="usage" element={<PlatformTablePage table="usage_counters" title="Usage limits" description="Usage counters for package limits and add-on allowances." showBusinessName />} />
            <Route path="settings" element={<PlatformSettingsPage />} />
            <Route path="audit-logs" element={<PlatformTablePage table="audit_logs" title="Audit logs" description="Platform and tenant audit history." showBusinessName />} />
            <Route path="*" element={<PlaceholderPage title="Admin page" description="Super admin workspace scaffold." />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['owner', 'manager', 'staff', 'super_admin']} />}>
          <Route path="business" element={<DashboardLayout />}>
            <Route index element={<BusinessDashboardPage />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="subscription" element={<BusinessSubscriptionPage />} />
            <Route path="module-access" element={<BusinessModuleAccessPage />} />
            <Route path="add-ons" element={<AddOnManagementPage />} />
            <Route path="usage" element={<UsageLimitsPage />} />
            <Route path="packages" element={<PackageComparisonPage />} />
            <Route element={<ModuleRoute moduleKey="booking" moduleName="Booking module" />}>
              <Route path="bookings" element={<BookingsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="membership" moduleName="Membership module" />}>
              <Route path="memberships" element={<CustomerMembershipsPage />} />
              <Route path="memberships/plans" element={<MembershipPlansPage />} />
              <Route path="memberships/:membershipId" element={<MembershipDetailsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="loyalty" moduleName="Loyalty module" />}>
              <Route path="loyalty" element={<LoyaltySettingsPage />} />
              <Route path="loyalty/settings" element={<LoyaltySettingsPage />} />
              <Route path="loyalty/rewards" element={<RewardsCatalogPage />} />
              <Route path="loyalty/points" element={<CustomerPointsPage />} />
              <Route path="loyalty/history" element={<PointsHistoryPage />} />
              <Route path="loyalty/birthday" element={<BirthdayRewardsPage />} />
              <Route path="loyalty/referrals" element={<ReferralRewardsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="pos" moduleName="POS module" />}>
              <Route path="pos" element={<POSCheckoutPage />} />
              <Route path="pos/checkout" element={<POSCheckoutPage />} />
              <Route path="pos/orders" element={<POSOrdersPage />} />
              <Route path="pos/orders/:orderId" element={<POSOrderDetailsPage />} />
              <Route path="pos/receipts" element={<POSReceiptsPage />} />
              <Route path="pos/closing" element={<POSDailyClosingPage />} />
              <Route path="pos/refunds" element={<POSRefundsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="inventory" moduleName="Inventory module" />}>
              <Route path="inventory" element={<ProductsPage />} />
              <Route path="inventory/products" element={<ProductsPage />} />
              <Route path="inventory/products/:productId" element={<ProductDetailsPage />} />
              <Route path="inventory/stock-in" element={<StockInPage />} />
              <Route path="inventory/stock-out" element={<StockOutPage />} />
              <Route path="inventory/adjustments" element={<StockAdjustmentPage />} />
              <Route path="inventory/transfers" element={<StockTransferPage />} />
              <Route path="inventory/low-stock" element={<LowStockAlertsPage />} />
              <Route path="inventory/report" element={<InventoryReportPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="staff_commission" moduleName="Staff & Commission module" />}>
              <Route path="staff" element={<StaffListPage />} />
              <Route path="staff/list" element={<StaffListPage />} />
              <Route path="staff/calendar" element={<StaffCalendarPage />} />
              <Route path="staff/commissions" element={<CommissionSettingsPage />} />
              <Route path="staff/commission-report" element={<CommissionReportPage />} />
              <Route path="staff/performance" element={<StaffPerformancePage />} />
              <Route path="staff/:staffId" element={<StaffDetailsPage />} />
              <Route path="staff/:staffId/schedule" element={<StaffSchedulePage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="payment" moduleName="Payment module" />}>
              <Route path="payments" element={<PaymentsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="reports" moduleName="Reports module" />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="marketing" moduleName="Marketing module" />}>
              <Route path="marketing" element={<MarketingPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="multi_branch" moduleName="Multi-branch module" />}>
              <Route path="branches" element={<BranchesPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="core" moduleName="Settings" />}>
              <Route path="settings" element={<BusinessSettingsPage />} />
            </Route>
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['customer', 'super_admin']} />}>
          <Route path="customer" element={<CustomerPortalLayout />}>
            <Route element={<ModuleRoute moduleKey="customer_portal" moduleName="Customer Portal module" />}>
              <Route index element={<CustomerHomePage />} />
              <Route path="book" element={<CustomerBookingPage />} />
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
