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
   * True from the moment a brand-new tenant is provisioned until onboarding is
   * reached. The first user (Tenant Admin) is routed to Onboarding & Connect
   * after MFA setup; invited users joining an existing tenant are not.
   */
  firstRun: boolean;
  setRegisterEmail: (email: string) => void;
  setRegisterVerified: (v: boolean) => void;
  setFirstRun: (v: boolean) => void;
  reset: () => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  registerEmail: '',
  registerVerified: false,
  firstRun: false,
  setRegisterEmail: (registerEmail) => set({ registerEmail }),
  setRegisterVerified: (registerVerified) => set({ registerVerified }),
  setFirstRun: (firstRun) => set({ firstRun }),
  reset: () => set({ registerEmail: '', registerVerified: false, firstRun: false }),
}));
