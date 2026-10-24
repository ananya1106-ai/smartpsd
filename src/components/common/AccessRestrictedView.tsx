import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, Building2 } from 'lucide-react';
import { UserRole } from '../../types';

interface AccessRestrictedViewProps {
  currentRole: UserRole;
  attemptedTab: string;
  onReturnToDashboard: () => void;
}

export const AccessRestrictedView: React.FC<AccessRestrictedViewProps> = ({
  currentRole,
  attemptedTab,
  onReturnToDashboard,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="max-w-md w-full bg-[#141D2A] border border-[#263449] rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/50 border border-rose-800/40 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 text-[11px] font-mono font-semibold border border-rose-800/50">
            <Lock className="w-3 h-3" />
            Statutory RBAC Clearance Gate
          </div>
          <h2 className="text-xl font-bold text-white mt-3">Access Restricted</h2>
          <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
            Your verified operational role (<strong className="text-[#C4B5FD]">{currentRole}</strong>) does not have authorization to access the requested module (
            <code className="text-rose-300 font-mono text-[11px] bg-[#0D1420] px-1.5 py-0.5 rounded">
              {attemptedTab}
            </code>
            ).
          </p>
        </div>

        <div className="bg-[#0D1420] border border-[#263449] rounded-xl p-3.5 text-left text-xs space-y-1.5 text-[#94A3B8]">
          <div className="text-[#F1F5F9] font-semibold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#C4B5FD]" />
            <span>Dual-Key Administrative Governance</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Warehouse intake, dispatch allocations, and administrative settings are restricted exclusively to personnel cleared in the official <code className="font-mono text-white">public.user_profiles</code> database registry.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnToDashboard}
          className="w-full py-2.5 px-4 rounded-xl bg-[#A9144B] hover:bg-[#801B3A] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Authorized Dashboard</span>
        </button>
      </div>
    </div>
  );
};
