'use client';

import { useActionState } from 'react';
import { addMember } from '@/app/admin/members/actions';
import {
  INITIAL_STATE,
  type DuplicateView,
  type MemberFormValues,
} from '@/app/admin/members/form-state';
import { Form, Notice, SelectField, Text, TextField } from './AuthCard';
import { PendingButton } from './PendingButton';
import adminStyles from './AdminPage.module.css';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function HiddenValues({ values, confirmedExpired }: { values: MemberFormValues; confirmedExpired?: boolean }) {
  return (
    <>
      <input type="hidden" name="name" value={values.name} />
      <input type="hidden" name="tier" value={values.tier} />
      <input type="hidden" name="expiry" value={values.expiry} />
      <input type="hidden" name="phone" value={values.phone} />
      {confirmedExpired && <input type="hidden" name="confirmExpired" value="1" />}
    </>
  );
}

function DuplicateCard({ match }: { match: DuplicateView }) {
  const why = [match.phoneMatch && 'same phone number', match.nameMatch && 'same name']
    .filter(Boolean)
    .join(' and ');
  return (
    <li className={adminStyles.item}>
      <p className={adminStyles.itemName}>{match.name}</p>
      <p className={adminStyles.itemMeta}>Membership ID {match.membershipId}, {why}</p>
      <p className={adminStyles.itemMeta}>
        {match.tier === 'PREMIUM' ? 'Premium' : 'Basic'}, expires{' '}
        {dateFormat.format(new Date(`${match.expiry}T00:00:00Z`))}
      </p>
      <p className={adminStyles.itemMeta}>Phone {match.phone ?? 'not recorded'}</p>
      <p className={adminStyles.itemMeta}>
        {match.accountEmail ? `Linked account: ${match.accountEmail}` : 'No linked account'}
      </p>
      <PendingButton name="useMember" value={match.id} secondary skipValidation>
        Use this member
      </PendingButton>
    </li>
  );
}

export function AddMemberForm() {
  const [state, formAction] = useActionState(addMember, INITIAL_STATE);

  if (state.step === 'confirmExpired') {
    return (
      <Form key={state.nonce} action={formAction}>
        <HiddenValues values={state.values} />
        <Notice notice={{ tone: 'warning', text: 'This membership has already expired. Save anyway?' }} />
        <PendingButton name="confirmExpired" value="1">
          Save anyway
        </PendingButton>
        <PendingButton name="back" value="1" secondary skipValidation>
          Go back
        </PendingButton>
      </Form>
    );
  }

  if (state.step === 'duplicates') {
    const strong = state.matches.some((m) => m.phoneMatch);
    return (
      <Form key={state.nonce} action={formAction}>
        <HiddenValues values={state.values} confirmedExpired={state.confirmedExpired} />
        <Notice
          notice={
            strong
              ? {
                  tone: 'error',
                  text: 'A member with this phone number already exists. This is very likely the same person. Check before you create a second record.',
                }
              : {
                  tone: 'warning',
                  text: 'A member with this name already exists. It may be the same person, or a different person with the same name.',
                }
          }
        />
        <ul className={adminStyles.list}>
          {state.matches.map((match) => (
            <DuplicateCard key={match.id} match={match} />
          ))}
        </ul>
        <PendingButton name="confirmNew" value="1">
          No, create a new member
        </PendingButton>
        <PendingButton name="back" value="1" secondary skipValidation>
          Go back
        </PendingButton>
      </Form>
    );
  }

  return (
    <Form key={state.nonce} action={formAction}>
      {state.done && <Notice notice={{ tone: 'info', text: state.done }} />}
      {state.error && <Notice notice={{ tone: 'error', text: state.error }} />}
      <Text>The system makes the membership ID. You will see it after you save.</Text>
      <TextField
        name="name"
        label="Full name"
        type="text"
        autoComplete="off"
        maxLength={100}
        defaultValue={state.values.name}
      />
      <SelectField
        name="tier"
        label="Tier"
        defaultValue={state.values.tier}
        options={[
          { value: 'BASIC', label: 'Basic' },
          { value: 'PREMIUM', label: 'Premium' },
        ]}
      />
      <TextField
        name="expiry"
        label="Expiry date"
        type="date"
        autoComplete="off"
        defaultValue={state.values.expiry}
      />
      <TextField
        name="phone"
        label="Phone (optional)"
        type="tel"
        autoComplete="off"
        required={false}
        maxLength={25}
        defaultValue={state.values.phone}
      />
      <PendingButton>Add member</PendingButton>
    </Form>
  );
}
