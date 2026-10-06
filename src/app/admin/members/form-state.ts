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
// `key` is the creation key the form sends back with every submit. It stays the same while one
// member is being entered, including through warnings and errors, and changes after a save.
export type AddMemberState =
  | { step: 'form'; nonce: number; key: string; values: MemberFormValues; error: string | null; done: string | null }
  | { step: 'confirmExpired'; nonce: number; key: string; values: MemberFormValues }
  | {
      step: 'duplicates';
      nonce: number;
      key: string;
      values: MemberFormValues;
      confirmedExpired: boolean;
      matches: DuplicateView[];
    };

export function initialState(key: string): AddMemberState {
  return { step: 'form', nonce: 0, key, values: EMPTY_VALUES, error: null, done: null };
}
