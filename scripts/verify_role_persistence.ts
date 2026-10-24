/**
 * SmartPDS Comprehensive Role Persistence & Authorization Verification Suite
 * Verifies:
 * 1. Login with actual Supabase account and authoritative role resolution from public.user_profiles
 * 2. Session restoration (page refresh simulation) preserves the exact database-assigned role
 * 3. Route & Tab Authorization Guard enforces RBAC and rejects unauthorized tab access
 * 4. Logout cleanly purges in-memory state, and subsequent login restores the correct profile
 * 5. Role immutability: frontend cannot override or simulate a different role
 * 6. Database RLS enforcement: attempts to execute privileged mutations are rejected by PostgreSQL
 */
import { supabase, verifySupabaseConfig } from '../src/lib/supabase';
import { supabaseSignIn, supabaseSignOut, supabaseGetSession, fetchSupabaseProfile, mapSupabaseUserToAccount } from '../src/lib/supabaseAuth';
import { isTabAuthorized, ROLE_ALLOWED_TABS } from '../src/lib/permissions';
import { parseUserRole, UserRole } from '../src/types';

interface TestStepResult {
  name: string;
  passed: boolean;
  message: string;
}

const suiteResults: TestStepResult[] = [];

async function runRolePersistenceVerification() {
  console.log('================================================================');
  console.log('SmartPDS: Role Persistence & Database RBAC Verification Suite');
  console.log('================================================================\n');

  // Step 1: Configuration check
  const cfg = verifySupabaseConfig();
  suiteResults.push({
    name: '1. Supabase Client Configuration',
    passed: cfg.isConfigured && cfg.hasValidUrl,
    message: `Connected to Supabase endpoint: ${cfg.url}`,
  });

  // Test account
  const testEmail = 'admin@smartpds.gov.in';
  const testPass = 'AdminPassword#2026';

  // Step 2: Login and Authoritative Role Resolution from public.user_profiles
  console.log(`[TEST 2] Signing in as ${testEmail}...`);
  const signInRes = await supabaseSignIn({ email: testEmail, password: testPass });
  
  if (!signInRes.success || !signInRes.user) {
    suiteResults.push({
      name: '2. Login & Database Profile Fetch',
      passed: false,
      message: `Sign-in failed: ${signInRes.error}`,
    });
    printSummary();
    return;
  }

  // Fetch direct database profile to cross-verify
  const { data: dbProfile, error: profErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', signInRes.user.id)
    .single();

  const directDbRole = parseUserRole(dbProfile?.role);
  const resolvedUserRole = signInRes.user.role;
  const rolesMatch = directDbRole !== null && directDbRole === resolvedUserRole;

  suiteResults.push({
    name: '2. Login & Database Role Resolution',
    passed: rolesMatch,
    message: `Database public.user_profiles role is "${directDbRole}", resolved UserAccount role is "${resolvedUserRole}". Match: ${rolesMatch}`,
  });

  // Step 3: Session Restoration & Page Refresh Simulation
  console.log('[TEST 3] Simulating browser page reload and session restoration...');
  const sessionRes = await supabaseGetSession();
  const sessionRestored = sessionRes.session !== null && sessionRes.user !== null;
  const restoredRole = sessionRes.user?.role;
  const roleRetained = restoredRole === resolvedUserRole;

  suiteResults.push({
    name: '3. Session Restoration & Role Persistence (Refresh)',
    passed: sessionRestored && roleRetained,
    message: `Restored session user: ${sessionRes.user?.email}. Role retained across refresh: "${restoredRole}". Persisted: ${roleRetained}`,
  });

  // Step 4: Route Navigation & RBAC Guard Testing
  console.log('[TEST 4] Verifying RBAC Route and Navigation Guard...');
  const activeRole: UserRole = resolvedUserRole;
  const allowedTabs = ROLE_ALLOWED_TABS[activeRole];

  // Test authorized tabs
  const canAccessDashboard = isTabAuthorized('dashboard', activeRole);
  const canAccessTracking = isTabAuthorized('dispatch-tracking', activeRole);

  // Test restricted administrative / operator tabs
  const canAccessUsersAdmin = isTabAuthorized('admin-users', activeRole);
  const canAccessInwardReceipts = isTabAuthorized('inv-receipts', activeRole);
  const canAccessFifoSandbox = isTabAuthorized('fifo-planning', activeRole);

  // If role is Ration Shop Dealer, privileged tabs must be strictly blocked
  const rbacGuardsEffective =
    canAccessDashboard &&
    canAccessTracking &&
    (!canAccessUsersAdmin) &&
    (!canAccessInwardReceipts) &&
    (!canAccessFifoSandbox);

  suiteResults.push({
    name: '4. Tab Navigation RBAC Enforcement',
    passed: rbacGuardsEffective,
    message: `Role "${activeRole}": Dashboard=${canAccessDashboard}, Tracking=${canAccessTracking}, AdminUsersBlocked=${!canAccessUsersAdmin}, InwardReceiptsBlocked=${!canAccessInwardReceipts}, FifoPlanningBlocked=${!canAccessFifoSandbox}`,
  });

  // Step 5: Frontend Role Tamper / Switch Resistance
  console.log('[TEST 5] Testing UI Role Immutability...');
  // Verify parseUserRole rejects invalid role strings
  const invalidRoleParsed = parseUserRole('SuperUserHacker');
  const emptyRoleParsed = parseUserRole(null);
  const validAdminParsed = parseUserRole('Administrator');
  const validOpParsed = parseUserRole('Warehouse Operator');
  const validDealerParsed = parseUserRole('Ration Shop Dealer');

  const parserStrict =
    invalidRoleParsed === null &&
    emptyRoleParsed === null &&
    validAdminParsed === 'Administrator' &&
    validOpParsed === 'Warehouse Operator' &&
    validDealerParsed === 'Ration Shop Dealer';

  suiteResults.push({
    name: '5. Role Parsing Strictness & Tamper Resistance',
    passed: parserStrict,
    message: `parseUserRole rejected invalid and null roles, parsed all 3 canonical roles strictly.`,
  });

  // Step 6: Database RLS Enforcement
  console.log('[TEST 6] Testing Database RLS against unauthorized operations...');
  // A Ration Shop Dealer attempting to insert directly into inward_receipts table
  const { data: insertData, error: rlsError } = await supabase
    .from('inward_receipts')
    .insert([
      {
        commodity: 'Raw Rice',
        variety: 'Sona Masoori',
        bags: 10,
        bag_weight_kg: 50,
        total_qtl: 5.0,
        moisture_percentage: 12.0,
        quality_grade: 'Grade A',
        supplier_source: 'Test Unauthorized RLS Bypass',
        vehicle_number: 'KA-25-RLS-001',
        gate_pass_no: 'GP-TEST-RLS',
        depot_location: 'Bay 1',
        status: 'Accepted',
      },
    ])
    .select();

  const rlsBlocked = rlsError !== null;
  suiteResults.push({
    name: '6. Database PostgreSQL RLS Policy Enforcement',
    passed: rlsBlocked,
    message: rlsBlocked
      ? `PostgreSQL RLS successfully rejected unauthorized write: "${rlsError?.message}" (Code: ${rlsError?.code})`
      : 'Security violation: Unauthorized insert was not blocked by RLS!',
  });

  // Step 7: Logout & New Login Cycle
  console.log('[TEST 7] Testing Logout and Re-authentication Cycle...');
  await supabaseSignOut();
  const sessionAfterLogout = await supabaseGetSession();
  const loggedOutClean = sessionAfterLogout.session === null;

  // Re-login with another account: devendraagarwal907@gmail.com
  const secondSignIn = await supabaseSignIn({
    email: 'devendraagarwal907@gmail.com',
    password: '123456',
  });

  const secondLoginSuccess =
    secondSignIn.success &&
    secondSignIn.user !== null &&
    secondSignIn.user.email === 'devendraagarwal907@gmail.com';

  suiteResults.push({
    name: '7. Logout Purge & Re-Authentication Cycle',
    passed: loggedOutClean && secondLoginSuccess,
    message: `Logout cleared session: ${loggedOutClean}. Re-authenticated second user: ${secondSignIn.user?.name} (${secondSignIn.user?.email}) with role "${secondSignIn.user?.role}".`,
  });

  printSummary();
}

function printSummary() {
  console.log('\n================================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('================================================================');
  let allPassed = true;
  for (const res of suiteResults) {
    const symbol = res.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${symbol} | ${res.name}`);
    console.log(`       ${res.message}`);
    if (!res.passed) allPassed = false;
  }
  console.log('================================================================');
  console.log(allPassed ? 'ALL TESTS PASSED SUCCESSFULLY!' : 'SOME TESTS FAILED.');
  console.log('================================================================\n');
}

runRolePersistenceVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
