import { supabase, supabaseStatus } from './supabase';
import { UserRole, UserAccount, parseUserRole } from '../types';

export interface SupabaseAuthResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
  errorCode?: string;
  verified?: boolean;
  emailSent?: boolean;
}

export interface ProfileFetchResult {
  profile: any | null;
  error?: string;
  isMissing?: boolean;
}

export interface MapAccountResult {
  account?: UserAccount;
  error?: string;
}

/**
 * Resolves the valid, reachable web app origin.
 * Strictly guarantees that localhost:3000 is never hardcoded.
 */
export function getValidAppOrigin(): string | undefined {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && !origin.startsWith('file:') && !origin.startsWith('blob:')) {
      return origin.replace(/\/+$/, '');
    }
  }

  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    try {
      const parsed = new URL(envUrl.trim());
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return envUrl.trim().replace(/\/+$/, '');
      }
    } catch {
      // ignore invalid URL
    }
  }

  return undefined;
}

/**
 * Maps Supabase Auth user + public.user_profiles row into a strictly verified UserAccount.
 * The authorized role MUST come from the database record. It will never guess, simulate, or default.
 */
export function mapSupabaseUserToAccount(
  authUser: any,
  profileRow: any
): MapAccountResult {
  if (!profileRow) {
    return {
      error: 'Access Denied: No personnel profile record found in public.user_profiles for this account.',
    };
  }

  const validatedRole = parseUserRole(profileRow.role);
  if (!validatedRole) {
    return {
      error: `Invalid role configuration: "${profileRow.role}". Valid statutory roles in public.user_profiles are Administrator, Warehouse Operator, or Ration Shop Dealer.`,
    };
  }

  const isEmailVerified = Boolean(
    authUser.email_confirmed_at || authUser.confirmed_at || authUser.user_metadata?.email_verified
  );

  const name: string =
    profileRow.name ||
    authUser.user_metadata?.name ||
    authUser.email?.split('@')[0] ||
    'Civil Supplies Officer';

  const designation: string =
    profileRow.designation ||
    (validatedRole === 'Administrator'
      ? 'State Systems & Security Administrator'
      : validatedRole === 'Warehouse Operator'
      ? 'Senior Warehouse Intake & Gate Operator'
      : 'Licensed Fair Price Shop Dealer');

  const department: string =
    profileRow.department ||
    (validatedRole === 'Administrator'
      ? 'Civil Supplies IT Directorate'
      : validatedRole === 'Warehouse Operator'
      ? 'Depot Bay Operations'
      : 'Fair Price Shop Network');

  return {
    account: {
      id: authUser.id,
      name,
      email: authUser.email || profileRow.email || '',
      role: validatedRole,
      designation,
      department,
      lastLogin: profileRow.last_login || new Date().toISOString(),
      emailVerified: isEmailVerified,
    },
  };
}

/**
 * Fetches authoritative user profile from public.user_profiles table by authenticated user's UUID.
 */
export async function fetchSupabaseProfile(userId: string): Promise<ProfileFetchResult> {
  if (!supabase) return { profile: null, error: 'Supabase client is not initialized.' };
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[SmartPDS Supabase Auth]: Profile fetch error:', error.message);
      return { profile: null, error: error.message };
    }
    if (!data) {
      return { profile: null, isMissing: true };
    }
    return { profile: data };
  } catch (err: any) {
    console.warn('[SmartPDS Supabase Auth]: Profile query exception:', err?.message || err);
    return { profile: null, error: err?.message || 'Database query error.' };
  }
}

/**
 * Supabase Sign In with Email and Password.
 * Resolves authorized role exclusively from public.user_profiles.
 */
export async function supabaseSignIn(credentials: {
  email: string;
  password?: string;
  role?: UserRole;
}): Promise<SupabaseAuthResult> {
  if (!supabaseStatus.isConfigured || !supabase) {
    return {
      success: false,
      errorCode: 'supabase/not-configured',
      error: 'Supabase credentials are not configured in environment.',
    };
  }

  const { email, password } = credentials;

  if (!email || !email.trim()) {
    return {
      success: false,
      errorCode: 'auth/invalid-email',
      error: 'Please enter your registered official email address.',
    };
  }

  if (!password || !password.trim()) {
    return {
      success: false,
      errorCode: 'auth/missing-password',
      error: 'Please enter your account password.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      let friendlyMsg = error.message;
      if (error.message.includes('Invalid login credentials')) {
        friendlyMsg = 'Invalid email or password. Please verify your credentials.';
      } else if (error.message.includes('Email not confirmed')) {
        friendlyMsg = 'Your email address has not been confirmed yet. Please verify your email.';
      }
      return {
        success: false,
        error: friendlyMsg,
        errorCode: error.status ? `supabase/${error.status}` : 'auth/invalid-credential',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No user data returned from authentication.',
        errorCode: 'auth/unknown-error',
      };
    }

    // Fetch authoritative profile record directly from database
    const profileRes = await fetchSupabaseProfile(data.user.id);

    if (profileRes.error) {
      return {
        success: false,
        error: `Database profile fetch error: ${profileRes.error}. Please retry.`,
        errorCode: 'auth/profile-fetch-error',
      };
    }

    if (profileRes.isMissing || !profileRes.profile) {
      return {
        success: false,
        error: `Access Denied: Authenticated account (${data.user.email}) has no profile record in public.user_profiles. An authorized Administrator must provision your profile and role before system access is granted.`,
        errorCode: 'auth/missing-profile',
      };
    }

    const mapResult = mapSupabaseUserToAccount(data.user, profileRes.profile);
    if (mapResult.error || !mapResult.account) {
      return {
        success: false,
        error: mapResult.error || 'Invalid role assignment in database profile.',
        errorCode: 'auth/invalid-role',
      };
    }

    // Update last_login timestamp in public.user_profiles asynchronously
    void ((supabase as any)
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id));

    const isVerified = Boolean(
      data.user.email_confirmed_at || data.user.confirmed_at
    );

    return {
      success: true,
      user: mapResult.account,
      verified: isVerified,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Authentication error occurred.',
      errorCode: 'auth/network-error',
    };
  }
}

/**
 * Supabase Sign Up with Email and Password
 */
export async function supabaseSignUp(credentials: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}): Promise<SupabaseAuthResult> {
  if (!supabaseStatus.isConfigured || !supabase) {
    return {
      success: false,
      errorCode: 'supabase/not-configured',
      error: 'Supabase credentials are not configured in environment.',
    };
  }

  const { email, password, name, role } = credentials;

  if (!email || !email.trim()) {
    return {
      success: false,
      errorCode: 'auth/invalid-email',
      error: 'Please enter a valid official email address.',
    };
  }

  if (!password || password.length < 6) {
    return {
      success: false,
      errorCode: 'auth/weak-password',
      error: 'Password must be at least 6 characters long.',
    };
  }

  const validOrigin = getValidAppOrigin();
  const signUpOptions: {
    data: { name: string; requested_role: UserRole };
    emailRedirectTo?: string;
  } = {
    data: {
      name: name.trim(),
      requested_role: role,
    },
  };

  if (validOrigin) {
    signUpOptions.emailRedirectTo = `${validOrigin}/verify-email`;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: signUpOptions,
    });

    if (error) {
      let friendlyMsg = error.message;
      if (error.message.includes('User already registered')) {
        friendlyMsg = 'An account with this email address is already registered in Supabase.';
      }
      return {
        success: false,
        error: friendlyMsg,
        errorCode: error.status ? `supabase/${error.status}` : 'auth/signup-failed',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Registration failed to return user profile.',
        errorCode: 'auth/unknown-error',
      };
    }

    // Give database trigger a moment to commit, then fetch the authoritative profile
    let profileRes = await fetchSupabaseProfile(data.user.id);
    if (!profileRes.profile) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      profileRes = await fetchSupabaseProfile(data.user.id);
    }

    let userAccount: UserAccount | undefined;
    if (profileRes.profile) {
      const mapRes = mapSupabaseUserToAccount(data.user, profileRes.profile);
      userAccount = mapRes.account;
    }

    const isVerified = Boolean(data.user.email_confirmed_at || data.user.confirmed_at);

    return {
      success: true,
      user: userAccount,
      verified: isVerified,
      emailSent: !isVerified,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to complete registration.',
      errorCode: 'auth/network-error',
    };
  }
}

/**
 * Supabase Sign Out
 */
export async function supabaseSignOut(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[SmartPDS Supabase Auth]: Sign out note:', e);
  }
}

/**
 * Restore current Supabase Session and reload authoritative role from public.user_profiles
 */
export async function supabaseGetSession(): Promise<{
  user: UserAccount | null;
  session: any | null;
  error?: string;
  isMissingProfile?: boolean;
}> {
  if (!supabase) return { user: null, session: null };
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session || !data.session.user) {
      return { user: null, session: null };
    }

    const authUser = data.session.user;
    const profileRes = await fetchSupabaseProfile(authUser.id);

    if (profileRes.error) {
      return {
        user: null,
        session: data.session,
        error: profileRes.error,
      };
    }

    if (profileRes.isMissing || !profileRes.profile) {
      return {
        user: null,
        session: data.session,
        isMissingProfile: true,
      };
    }

    const mapResult = mapSupabaseUserToAccount(authUser, profileRes.profile);
    if (mapResult.error || !mapResult.account) {
      return {
        user: null,
        session: data.session,
        error: mapResult.error || 'Invalid role in profile',
      };
    }

    return { user: mapResult.account, session: data.session };
  } catch (err: any) {
    return { user: null, session: null, error: err?.message };
  }
}

/**
 * Send Password Reset Email via Supabase
 */
export async function supabaseSendPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };
  if (!email || !email.trim()) return { success: false, error: 'Email address is required.' };

  const validOrigin = getValidAppOrigin();
  const resetOptions: { redirectTo?: string } = {};
  if (validOrigin) {
    resetOptions.redirectTo = `${validOrigin}/?mode=resetPassword`;
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), resetOptions);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Password reset request failed.' };
  }
}

/**
 * Resend Email Verification link via Supabase
 */
export async function supabaseResendVerification(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };
  if (!email || !email.trim()) return { success: false, error: 'Email address is required.' };

  const validOrigin = getValidAppOrigin();
  const resendParams: {
    type: 'signup';
    email: string;
    options?: { emailRedirectTo?: string };
  } = {
    type: 'signup',
    email: email.trim(),
  };

  if (validOrigin) {
    resendParams.options = {
      emailRedirectTo: `${validOrigin}/verify-email`,
    };
  }

  try {
    const { error } = await supabase.auth.resend(resendParams);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to resend confirmation email.' };
  }
}
