// Transient state carried across the multi-step registration and authentication
// wizards (which live on separate routes). Not persisted — refreshing mid-flow
// restarts it, which is the correct behaviour for a synthetic demo.

import { create } from 'zustand';

interface FlowState {
  /** Work email captured on Request Access, used by Verify and Terms. */
  registerEmail: string;
  /** Email confirmed via the verification code. */
  registerVerified: boolean;
  /**
   * Domain ownership confirmed on the Verify Domain screen. Gates Terms — an
   * unverified domain must never reach tenant provisioning.
   */
  domainVerified: boolean;
  /** Owner password created on the final registration screen. */
  passwordSet: boolean;
  /**
   * True from the moment a brand-new tenant is provisioned until onboarding is
   * reached. The first user (Tenant Admin) is routed to Onboarding & Connect
   * after MFA setup and password creation; invited users joining an existing
   * tenant are not.
   */
  firstRun: boolean;
  /** Email entered on Forgot Password, used by the OTP and Reset screens. */
  resetEmail: string;
  /** Recovery code confirmed — the only way to reach Reset without a tokened link. */
  resetOtpVerified: boolean;
  setRegisterEmail: (email: string) => void;
  setRegisterVerified: (v: boolean) => void;
  setDomainVerified: (v: boolean) => void;
  setPasswordSet: (v: boolean) => void;
  setFirstRun: (v: boolean) => void;
  setResetEmail: (email: string) => void;
  setResetOtpVerified: (v: boolean) => void;
  reset: () => void;
}

const EMPTY = {
  registerEmail: '',
  registerVerified: false,
  domainVerified: false,
  passwordSet: false,
  firstRun: false,
  resetEmail: '',
  resetOtpVerified: false,
};

export const useFlowStore = create<FlowState>((set) => ({
  ...EMPTY,
  setRegisterEmail: (registerEmail) => set({ registerEmail }),
  setRegisterVerified: (registerVerified) => set({ registerVerified }),
  setDomainVerified: (domainVerified) => set({ domainVerified }),
  setPasswordSet: (passwordSet) => set({ passwordSet }),
  setFirstRun: (firstRun) => set({ firstRun }),
  setResetEmail: (resetEmail) => set({ resetEmail }),
  setResetOtpVerified: (resetOtpVerified) => set({ resetOtpVerified }),
  reset: () => set({ ...EMPTY }),
}));
