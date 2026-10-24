import { UserRole } from '../types';
import { NavTab } from '../components/layout/Sidebar';

/**
 * Statutory RBAC Clearance Matrix
 * Single authoritative source of truth for UI navigation and route guarding across the 3 roles.
 */
export const ROLE_ALLOWED_TABS: Record<UserRole, NavTab[]> = {
  Administrator: [
    'dashboard',
    // Inventory
    'inv-stock',
    'inv-receipts',
    'inv-ledger',
    'inv-reconciliation',
    'stock',
    // FIFO
    'fifo-queue',
    'fifo-planning',
    'fifo-exceptions',
    'fifo-approvals',
    // Dispatch
    'dispatch-create',
    'dispatch-challans',
    'dispatch-tracking',
    'dispatch-returns',
    'dispatch',
    'challans',
    // AI
    'ai-copilot',
    'ai-risk',
    'ai-anomaly',
    'ai-reader',
    'ai-advisor',
    // Reports & Audit
    'audit-trail',
    'rep-stock',
    'rep-ageing',
    'rep-wastage',
    'audit',
    // Administration
    'admin-users',
    'admin-settings',
    'admin-approval-rules',
    'admin-activity',
    'settings',
  ],
  'Warehouse Operator': [
    'dashboard',
    // Inventory
    'inv-stock',
    'inv-receipts',
    'inv-ledger',
    'inv-reconciliation',
    'stock',
    // FIFO Operations
    'fifo-queue',
    'fifo-planning',
    'fifo-exceptions',
    'fifo-approvals',
    // Dispatch & Challans
    'dispatch-create',
    'dispatch-challans',
    'dispatch-tracking',
    'dispatch-returns',
    'dispatch',
    'challans',
    // AI Intelligence
    'ai-copilot',
    'ai-risk',
    'ai-anomaly',
    'ai-reader',
    'ai-advisor',
    // Audit & Reports
    'audit-trail',
    'rep-stock',
    'rep-ageing',
    'rep-wastage',
    'audit',
  ],
  'Ration Shop Dealer': [
    'dashboard',
    // Stock availability view
    'inv-stock',
    'stock',
    // FPS Dispatches, tracking, & discrepancy returns
    'dispatch-challans',
    'dispatch-tracking',
    'dispatch-returns',
    'challans',
    // AI Copilot Query
    'ai-copilot',
    'ai-advisor',
    // General stock reports
    'rep-stock',
  ],
};

export function isTabAuthorized(tab: NavTab, role: UserRole): boolean {
  const allowed = ROLE_ALLOWED_TABS[role];
  if (!allowed) return false;
  return allowed.includes(tab);
}
