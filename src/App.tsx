import { Navigate, Route, Routes } from 'react-router-dom'
import { ModuleRoute } from '@/components/auth/ModuleRoute'
import { CustomerProtectedRoute } from '@/components/auth/CustomerProtectedRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { CustomerPortalLayout } from '@/components/layout/CustomerPortalLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AddOnsManagementPage } from '@/pages/admin/AddOnsManagementPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { BackupHistoryPage } from '@/pages/admin/BackupHistoryPage'
import { BusinessDetailsPage } from '@/pages/admin/BusinessDetailsPage'
import { BusinessesPage } from '@/pages/admin/BusinessesPage'
import { DataGovernancePage } from '@/pages/admin/DataGovernancePage'
import { ModuleManagementPage } from '@/pages/admin/ModuleManagementPage'
import { PackageManagementPage } from '@/pages/admin/PackageManagementPage'
import { PlatformSettingsPage } from '@/pages/admin/PlatformSettingsPage'
import { PlatformTablePage } from '@/pages/admin/PlatformTablePage'
import { ShutdownModePage } from '@/pages/admin/ShutdownModePage'
import { SubscriptionsPage } from '@/pages/admin/SubscriptionsPage'
import { SystemHealthPage } from '@/pages/admin/SystemHealthPage'
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage'
import { CustomerRegisterPage } from '@/pages/auth/CustomerRegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { BookingsPage } from '@/pages/business/BookingsPage'
import { BusinessDashboardPage } from '@/pages/business/BusinessDashboardPage'
import { BusinessSetupWizardPage } from '@/pages/business/BusinessSetupWizardPage'
import { CustomerMembershipsPage as BizCustomerMembershipsPage } from '@/pages/business/CustomerMembershipsPage'
import { CrmPage } from '@/pages/business/crm/CrmPage'
import { CustomerCrmDetailsPage } from '@/pages/business/crm/CustomerCrmDetailsPage'
import { MembershipDetailsPage } from '@/pages/business/MembershipDetailsPage'
import { MembershipPlansPage } from '@/pages/business/MembershipPlansPage'
import { BirthdayRewardsPage } from '@/pages/business/loyalty/BirthdayRewardsPage'
import { CustomerPointsPage as BizCustomerPointsPage } from '@/pages/business/loyalty/CustomerPointsPage'
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
import { SuppliersPage } from '@/pages/business/inventory/SuppliersPage'
import { StaffListPage } from '@/pages/business/staff/StaffListPage'
import { StaffDetailsPage } from '@/pages/business/staff/StaffDetailsPage'
import { StaffSchedulePage } from '@/pages/business/staff/StaffSchedulePage'
import { StaffCalendarPage } from '@/pages/business/staff/StaffCalendarPage'
import { CommissionSettingsPage } from '@/pages/business/staff/CommissionSettingsPage'
import { CommissionReportPage } from '@/pages/business/staff/CommissionReportPage'
import { StaffPerformancePage } from '@/pages/business/staff/StaffPerformancePage'
import { BranchesPage } from '@/pages/business/BranchesPage'
import { BranchDetailsPage } from '@/pages/business/branches/BranchDetailsPage'
import { BranchDashboardPage } from '@/pages/business/branches/BranchDashboardPage'
import { BranchStaffPage } from '@/pages/business/branches/BranchStaffPage'
import { BranchBookingsPage } from '@/pages/business/branches/BranchBookingsPage'
import { BranchInventoryPage } from '@/pages/business/branches/BranchInventoryPage'
import { BranchComparisonReportPage } from '@/pages/business/branches/BranchComparisonReportPage'
import { NotificationTemplatesPage } from '@/pages/business/notifications/NotificationTemplatesPage'
import { ManualSendPage } from '@/pages/business/notifications/ManualSendPage'
import { NotificationLogPage } from '@/pages/business/notifications/NotificationLogPage'
import { BroadcastsPage } from '@/pages/business/notifications/BroadcastsPage'
import { NotificationSettingsPage } from '@/pages/business/notifications/NotificationSettingsPage'
import { RetentionAutomationPage } from '@/pages/business/notifications/RetentionAutomationPage'
import { ReportsDashboardPage } from '@/pages/business/reports/ReportsDashboardPage'
import { SalesReportPage } from '@/pages/business/reports/SalesReportPage'
import { BookingReportPage } from '@/pages/business/reports/BookingReportPage'
import { MembershipReportPage } from '@/pages/business/reports/MembershipReportPage'
import { CustomerReportPage } from '@/pages/business/reports/CustomerReportPage'
import { StaffReportPage } from '@/pages/business/reports/StaffReportPage'
import { InventoryReportPage as InvReportPage } from '@/pages/business/reports/InventoryReportPage'
import { PaymentReportPage } from '@/pages/business/reports/PaymentReportPage'
import { ProfitReportPage } from '@/pages/business/reports/ProfitReportPage'
import { LoyaltyReportPage } from '@/pages/business/reports/LoyaltyReportPage'
import { NoShowReportPage } from '@/pages/business/reports/NoShowReportPage'
import { BranchReportPage } from '@/pages/business/reports/BranchReportPage'
import { MarketingReportPage } from '@/pages/business/reports/MarketingReportPage'
import { ExportCenterPage } from '@/pages/business/reports/ExportCenterPage'
import { PaymentsPage } from '@/pages/business/payments/PaymentsPage'
import { PaymentDetailsPage } from '@/pages/business/payments/PaymentDetailsPage'
import { PendingVerificationPage } from '@/pages/business/payments/PendingVerificationPage'
import { InvoicesPage } from '@/pages/business/payments/InvoicesPage'
import { ReceiptsPage } from '@/pages/business/payments/ReceiptsPage'
import { RefundsPage } from '@/pages/business/payments/RefundsPage'
import { PaymentSettingsPage } from '@/pages/business/payments/PaymentSettingsPage'
import { CampaignsPage } from '@/pages/business/marketing/CampaignsPage'
import { PromoCodesPage } from '@/pages/business/marketing/PromoCodesPage'
import { SegmentsPage } from '@/pages/business/marketing/SegmentsPage'
import { BroadcastPage } from '@/pages/business/marketing/BroadcastPage'
import { CampaignReportPage } from '@/pages/business/marketing/CampaignReportPage'
import { BusinessProfilePage } from '@/pages/business/settings/BusinessProfilePage'
import { BookingRulesPage } from '@/pages/business/settings/BookingRulesPage'
import { MembershipSettingsPage } from '@/pages/business/settings/MembershipSettingsPage'
import { StaffPermissionsPage } from '@/pages/business/settings/StaffPermissionsPage'
import { AccountSettingsPage } from '@/pages/business/settings/AccountSettingsPage'
import { SecuritySettingsPage } from '@/pages/business/settings/SecuritySettingsPage'
import { WhiteLabelSettingsPage } from '@/pages/business/settings/WhiteLabelSettingsPage'
import { DataOwnershipPage } from '@/pages/business/settings/DataOwnershipPage'
import { QrCodesPage } from '@/pages/business/settings/QrCodesPage'
import { AddOnManagementPage } from '@/pages/business/AddOnManagementPage'
import { BusinessModuleAccessPage } from '@/pages/business/BusinessModuleAccessPage'
import { BusinessSubscriptionPage } from '@/pages/business/BusinessSubscriptionPage'
import { PackageComparisonPage } from '@/pages/business/PackageComparisonPage'
import { UpgradePage } from '@/pages/business/UpgradePage'
import { UsageLimitsPage } from '@/pages/business/UsageLimitsPage'
import { CustomerBookingPage } from '@/pages/customer/CustomerBookingPage'
import { CustomerHomePage } from '@/pages/customer/CustomerHomePage'
import { CustomerLoginPage } from '@/pages/customer/CustomerLoginPage'
import { CustomerPublicPage } from '@/pages/customer/CustomerPublicPage'
import { CustomerMembershipsPage } from '@/pages/customer/CustomerMembershipsPage'
import { CustomerRewardsPage } from '@/pages/customer/CustomerRewardsPage'
import { CustomerPointsPage } from '@/pages/customer/CustomerPointsPage'
import { CustomerBookingHistoryPage } from '@/pages/customer/CustomerBookingHistoryPage'
import { CustomerPaymentHistoryPage } from '@/pages/customer/CustomerPaymentHistoryPage'
import { CustomerProfilePage } from '@/pages/customer/CustomerProfilePage'
import { CustomerReviewPage } from '@/pages/customer/CustomerReviewPage'
import { PublicHomePage } from '@/pages/public/PublicHomePage'
import { PublicInfoPage } from '@/pages/public/PublicInfoPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="login" element={<AuthLayout />}>
          <Route index element={<LoginPage />} />
        </Route>
        <Route path="register-business" element={<AuthLayout />}>
          <Route index element={<RegisterPage />} />
        </Route>
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
        <Route path="public" element={<PublicLayout />}>
          <Route index element={<PublicHomePage />} />
        </Route>
        <Route element={<PublicLayout />}>
          <Route index element={<PublicHomePage />} />
          <Route path="features" element={<PublicInfoPage page="features" />} />
          <Route path="pricing" element={<PublicInfoPage page="pricing" />} />
          <Route path="demo" element={<PublicInfoPage page="demo" />} />
          <Route path="contact" element={<PublicInfoPage page="contact" />} />
        </Route>
        <Route element={<ProtectedRoute roles={['super_admin']} />}>
          <Route path="admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="businesses" element={<BusinessesPage />} />
            <Route path="businesses/:businessId" element={<BusinessDetailsPage />} />
            <Route path="businesses/:id" element={<BusinessDetailsPage />} />
            <Route path="packages" element={<PackageManagementPage />} />
            <Route path="modules" element={<ModuleManagementPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="add-ons" element={<AddOnsManagementPage />} />
            <Route path="addons" element={<AddOnsManagementPage />} />
            <Route path="billing" element={<PlatformTablePage table="billing_invoices" title="Billing" description="Platform billing invoices across all businesses." showBusinessName />} />
            <Route path="invoices" element={<PlatformTablePage table="billing_invoices" title="Billing invoices" description="Platform billing invoices, due dates, and paid status." showBusinessName />} />
            <Route path="payments" element={<PlatformTablePage table="payments" title="Payments" description="All tenant payment records and payment verification status." showBusinessName />} />
            <Route path="usage" element={<PlatformTablePage table="usage_counters" title="Usage limits" description="Usage counters for package limits and add-on allowances." showBusinessName />} />
            <Route path="backups" element={<BackupHistoryPage />} />
            <Route path="shutdown" element={<ShutdownModePage />} />
            <Route path="system-health" element={<SystemHealthPage />} />
            <Route path="settings" element={<PlatformSettingsPage />} />
            <Route path="data-governance" element={<DataGovernancePage />} />
            <Route path="audit-logs" element={<PlatformTablePage table="audit_logs" title="Audit logs" description="Platform and tenant audit history." showBusinessName />} />
            <Route path="*" element={<PlaceholderPage title="Admin page" description="Super admin workspace scaffold." />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['owner', 'manager', 'staff', 'super_admin']} />}>
          <Route path="app">
            <Route path="dashboard" element={<Navigate to="/business" replace />} />
            <Route path="calendar" element={<Navigate to="/business/bookings" replace />} />
            <Route path="bookings" element={<Navigate to="/business/bookings" replace />} />
            <Route path="customers" element={<Navigate to="/business/customers" replace />} />
            <Route path="members" element={<Navigate to="/business/memberships" replace />} />
            <Route path="pos" element={<Navigate to="/business/pos" replace />} />
            <Route path="products" element={<Navigate to="/business/inventory/products" replace />} />
            <Route path="inventory" element={<Navigate to="/business/inventory" replace />} />
            <Route path="staff" element={<Navigate to="/business/staff" replace />} />
            <Route path="payments" element={<Navigate to="/business/payments" replace />} />
            <Route path="loyalty" element={<Navigate to="/business/loyalty" replace />} />
            <Route path="rewards" element={<Navigate to="/business/loyalty/rewards" replace />} />
            <Route path="reports" element={<Navigate to="/business/reports" replace />} />
            <Route path="marketing" element={<Navigate to="/business/marketing" replace />} />
            <Route path="branches" element={<Navigate to="/business/branches" replace />} />
            <Route path="settings" element={<Navigate to="/business/settings" replace />} />
            <Route path="upgrade" element={<Navigate to="/business/upgrade" replace />} />
            <Route path="setup" element={<BusinessSetupWizardPage />} />
            <Route path="staff/dashboard" element={<Navigate to="/business/staff" replace />} />
          </Route>
          <Route path="business" element={<DashboardLayout />}>
            <Route index element={<BusinessDashboardPage />} />
            <Route path="setup" element={<BusinessSetupWizardPage />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="subscription" element={<BusinessSubscriptionPage />} />
            <Route path="module-access" element={<BusinessModuleAccessPage />} />
            <Route path="add-ons" element={<AddOnManagementPage />} />
            <Route path="usage" element={<UsageLimitsPage />} />
            <Route path="packages" element={<PackageComparisonPage />} />
            <Route element={<ModuleRoute moduleKey="core" moduleName="Simple CRM" />}>
              <Route path="customers" element={<CrmPage />} />
              <Route path="customers/:customerId" element={<CustomerCrmDetailsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="booking" moduleName="Booking module" />}>
              <Route path="bookings" element={<BookingsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="membership" moduleName="Membership module" />}>
              <Route path="memberships" element={<BizCustomerMembershipsPage />} />
              <Route path="memberships/plans" element={<MembershipPlansPage />} />
              <Route path="memberships/:membershipId" element={<MembershipDetailsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="loyalty" moduleName="Loyalty module" />}>
              <Route path="loyalty" element={<LoyaltySettingsPage />} />
              <Route path="loyalty/settings" element={<LoyaltySettingsPage />} />
              <Route path="loyalty/rewards" element={<RewardsCatalogPage />} />
              <Route path="loyalty/points" element={<BizCustomerPointsPage />} />
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
              <Route path="inventory/suppliers" element={<SuppliersPage />} />
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
              <Route path="payments/pending" element={<PendingVerificationPage />} />
              <Route path="payments/invoices" element={<InvoicesPage />} />
              <Route path="payments/receipts" element={<ReceiptsPage />} />
              <Route path="payments/refunds" element={<RefundsPage />} />
              <Route path="payments/settings" element={<PaymentSettingsPage />} />
              <Route path="payments/:paymentId" element={<PaymentDetailsPage />} />
            </Route>

            <Route element={<ModuleRoute moduleKey="reports" moduleName="Reports module" />}>
              <Route path="reports" element={<ReportsDashboardPage />} />
              <Route path="reports/sales" element={<SalesReportPage />} />
              <Route path="reports/bookings" element={<BookingReportPage />} />
              <Route path="reports/memberships" element={<MembershipReportPage />} />
              <Route path="reports/customers" element={<CustomerReportPage />} />
              <Route path="reports/loyalty" element={<LoyaltyReportPage />} />
              <Route path="reports/staff" element={<StaffReportPage />} />
              <Route path="reports/inventory" element={<InvReportPage />} />
              <Route path="reports/payments" element={<PaymentReportPage />} />
              <Route path="reports/profit" element={<ProfitReportPage />} />
              <Route path="reports/no-shows" element={<NoShowReportPage />} />
              <Route path="reports/branches" element={<BranchReportPage />} />
              <Route path="reports/marketing" element={<MarketingReportPage />} />
              <Route path="reports/export" element={<ExportCenterPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="notification" moduleName="Notification module" />}>
              <Route path="notifications" element={<NotificationTemplatesPage />} />
              <Route path="notifications/send" element={<ManualSendPage />} />
              <Route path="notifications/log" element={<NotificationLogPage />} />
              <Route path="notifications/broadcasts" element={<BroadcastsPage />} />
              <Route path="notifications/automation" element={<RetentionAutomationPage />} />
              <Route path="notifications/settings" element={<NotificationSettingsPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="marketing" moduleName="Marketing module" />}>
              <Route path="marketing" element={<CampaignsPage />} />
              <Route path="marketing/promos" element={<PromoCodesPage />} />
              <Route path="marketing/segments" element={<SegmentsPage />} />
              <Route path="marketing/broadcast" element={<BroadcastPage />} />
              <Route path="marketing/report" element={<CampaignReportPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="ai_assistant" moduleName="AI Assistant module" />}>
              <Route path="ai-assistant" element={<PlaceholderPage title="AI Assistant" description="AI assistant workspace for enterprise automation and operational help." />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="multi_branch" moduleName="Multi-branch module" />}>
              <Route path="branches" element={<BranchesPage />} />
              <Route path="branches/comparison" element={<BranchComparisonReportPage />} />
              <Route path="branches/:branchId" element={<BranchDetailsPage />} />
              <Route path="branches/:branchId/dashboard" element={<BranchDashboardPage />} />
              <Route path="branches/:branchId/staff" element={<BranchStaffPage />} />
              <Route path="branches/:branchId/bookings" element={<BranchBookingsPage />} />
              <Route path="branches/:branchId/inventory" element={<BranchInventoryPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="core" moduleName="Settings" />}>
              <Route path="settings" element={<BusinessProfilePage />} />
              <Route path="settings/profile" element={<BusinessProfilePage />} />
              <Route path="settings/branches" element={<BranchesPage />} />
              <Route path="settings/booking-rules" element={<BookingRulesPage />} />
              <Route path="settings/membership" element={<MembershipSettingsPage />} />
              <Route path="settings/loyalty" element={<LoyaltySettingsPage />} />
              <Route path="settings/payment" element={<PaymentSettingsPage />} />
              <Route path="settings/notifications" element={<NotificationTemplatesPage />} />
              <Route path="settings/staff-permissions" element={<StaffPermissionsPage />} />
              <Route path="settings/module-access" element={<BusinessModuleAccessPage />} />
              <Route path="settings/billing" element={<BusinessSubscriptionPage />} />
              <Route path="settings/white-label" element={<WhiteLabelSettingsPage />} />
              <Route path="settings/account" element={<AccountSettingsPage />} />
              <Route path="settings/security" element={<SecuritySettingsPage />} />
              <Route path="settings/qr-codes" element={<QrCodesPage />} />
            </Route>
            <Route element={<ModuleRoute moduleKey="data_ownership_backup" moduleName="Data Ownership & Backup module" />}>
              <Route path="settings/data-ownership" element={<DataOwnershipPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="biz/:businessId" element={<CustomerPublicPage />} />
        <Route path="b/:businessSlug" element={<CustomerPublicPage />} />
        <Route path="b/:businessSlug/book" element={<CustomerBookingPage />} />
        <Route path="b/:businessSlug/review" element={<CustomerReviewPage />} />
        <Route path="b/:businessSlug/login" element={<CustomerLoginPage />} />
        <Route path="b/:businessSlug/register" element={<AuthLayout />}>
          <Route index element={<CustomerRegisterPage />} />
        </Route>
        <Route element={<CustomerProtectedRoute />}>
          <Route path="customer/:businessId" element={<CustomerPortalLayout />}>
            <Route element={<ModuleRoute moduleKey="customer_portal" moduleName="Customer Portal module" />}>
              <Route index element={<CustomerHomePage />} />
              <Route path="book" element={<CustomerBookingPage />} />
              <Route path="membership" element={<CustomerMembershipsPage />} />
              <Route path="rewards" element={<CustomerRewardsPage />} />
              <Route path="points" element={<CustomerPointsPage />} />
              <Route path="bookings" element={<CustomerBookingHistoryPage />} />
              <Route path="history" element={<CustomerBookingHistoryPage />} />
              <Route path="payments" element={<CustomerPaymentHistoryPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
              <Route
                path="*"
                element={<PlaceholderPage title="Customer portal" description="Mobile-first customer pages are scaffolded." />}
              />
            </Route>
          </Route>
          <Route path="b/:businessSlug" element={<CustomerPortalLayout />}>
            <Route element={<ModuleRoute moduleKey="customer_portal" moduleName="Customer Portal module" />}>
              <Route path="portal" element={<CustomerHomePage />} />
              <Route path="book" element={<CustomerBookingPage />} />
              <Route path="membership" element={<CustomerMembershipsPage />} />
              <Route path="rewards" element={<CustomerRewardsPage />} />
              <Route path="points" element={<CustomerPointsPage />} />
              <Route path="bookings" element={<CustomerBookingHistoryPage />} />
              <Route path="history" element={<CustomerBookingHistoryPage />} />
              <Route path="payments" element={<CustomerPaymentHistoryPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
