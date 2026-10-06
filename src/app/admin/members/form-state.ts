// The state the add member form passes between the browser and the server action.

export interface MemberFormValues {
  name: string;
  tier: string;
  expiry: string;
  phone: string;
}

export const EMPTY_VALUES: MemberFormValues = { name: '', tier: 'BASIC', expiry: '', phone: '' };

export interface DuplicateView {
  id: string;
  membershipId: string;
  name: string;
  phone: string | null;
  tier: 'BASIC' | 'PREMIUM';
  // YYYY-MM-DD
  expiry: string;
  nameMatch: boolean;
  phoneMatch: boolean;
  accountEmail: string | null;
}

// `nonce` changes on every response, so the form remounts and shows fresh fields.
export type AddMemberState =
  | { step: 'form'; nonce: number; values: MemberFormValues; error: string | null; done: string | null }
  | { step: 'confirmExpired'; nonce: number; values: MemberFormValues }
  | {
      step: 'duplicates';
      nonce: number;
      values: MemberFormValues;
      confirmedExpired: boolean;
      matches: DuplicateView[];
    };

export const INITIAL_STATE: AddMemberState = {
  step: 'form',
  nonce: 0,
  values: EMPTY_VALUES,
  error: null,
  done: null,
};
