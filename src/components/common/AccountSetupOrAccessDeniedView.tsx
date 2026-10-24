import React, { useState } from 'react';
import {
  ShieldAlert,
  UserX,
  AlertTriangle,
  RotateCcw,
  LogOut,
  Building2,
  Lock,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export interface AccountSetupOrAccessDeniedProps {
  errorType: 'missing' | 'error' | 'invalid_role';
  errorMessage: string;
  userId?: string;
  email?: string;
  onRetry: () => Promise<void> | void;
  onSignOut: () => void;
}

export const AccountSetupOrAccessDeniedView: React.FC<AccountSetupOrAccessDeniedProps> = ({
  errorType,
  errorMessage,
  userId,
  email,
  onRetry,
  onSignOut,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const title =
    errorType === 'missing'
      ? 'Personnel Clearance Profile Pending'
      : errorType === 'invalid_role'
      ? 'Unauthorized System Role'
      : 'Profile Database Connection Error';

  const subtitle =
    errorType === 'missing'
      ? 'Authenticated session verified, but no active role record was located in public.user_profiles.'
      : errorType === 'invalid_role'
      ? 'Your database profile contains an unverified or deprecated clearance identifier.'
      : 'Unable to query the public.user_profiles database table due to a network or security exception.';

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F1F5F9] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl bg-[#141D2A] border border-[#263449] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center shrink-0">
            {errorType === 'missing' ? (
              <UserX className="w-6 h-6 text-amber-400" />
            ) : errorType === 'invalid_role' ? (
              <Lock className="w-6 h-6 text-rose-400" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-semibold">
                Statutory Access Gate
              </span>
              <span className="text-[11px] font-mono text-[#94A3B8]">PDS-SEC-04</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1.5">{title}</h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Account Details Box */}
        <div className="bg-[#0D1420] border border-[#263449] rounded-xl p-4 space-y-2.5 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#1E293B]">
            <span className="text-[#94A3B8]">Authenticated Identity:</span>
            <span className="text-[#F1F5F9] font-medium truncate">{email || 'Authenticated User'}</span>
          </div>
          {userId && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#1E293B]">
              <span className="text-[#94A3B8]">Supabase User UUID:</span>
              <span className="text-[#C4B5FD] font-mono text-[11px] truncate">{userId}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[#94A3B8]">Resolution Status:</span>
            <span
              className={`font-semibold ${
                errorType === 'missing'
                  ? 'text-amber-400'
                  : errorType === 'invalid_role'
                  ? 'text-rose-400'
                  : 'text-orange-400'
              }`}
            >
              {errorType === 'missing'
                ? 'Missing public.user_profiles Row'
                : errorType === 'invalid_role'
                ? 'Unrecognized Role Value'
                : 'Connection / RLS Query Exception'}
            </span>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="bg-[#1A2536]/50 border border-[#263449] rounded-xl p-4 space-y-2 text-xs text-[#CBD5E1]">
          <div className="flex items-center gap-2 font-semibold text-[#F1F5F9]">
            <Building2 className="w-4 h-4 text-[#C4B5FD]" />
            <span>National Food Security Act (NFSA) Governance Norms</span>
          </div>
          <p className="leading-relaxed text-[#94A3B8]">
            Under PDS warehouse security regulations, operational roles (
            <strong className="text-white">Administrator</strong>,{' '}
            <strong className="text-white">Warehouse Operator</strong>, or{' '}
            <strong className="text-white">Ration Shop Dealer</strong>) must be explicitly assigned in the{' '}
            <code className="text-[#C4B5FD] bg-[#0D1420] px-1 py-0.5 rounded">public.user_profiles</code>{' '}
            database table by a designated State Civil Supplies Systems Administrator.
          </p>
          <div className="text-[11px] text-[#94A3B8]/90 pt-1">
            {errorType === 'missing' ? (
              <span>
                Please notify your depot Area Manager or IT Administrator with your User UUID to establish your official role record.
              </span>
            ) : errorType === 'invalid_role' ? (
              <span>
                The role assigned in your profile is not recognized by the SmartPDS authorization matrix. Please contact system support.
              </span>
            ) : (
              <span>
                A temporary network or database query error occurred while checking permissions. Your session remains intact. You may retry verification below.
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#A9144B] hover:bg-[#801B3A] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RotateCcw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Verifying Database...' : 'Retry Profile Verification'}</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#1E293B] hover:bg-rose-950/40 hover:text-rose-300 text-[#CBD5E1] text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-[#263449] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
