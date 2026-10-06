import { AdminPage, AdminSection } from '@/components/admin/AdminPage';
import {
  Form,
  Notice,
  SelectField,
  SubmitButton,
  Text,
  TextField,
  type AuthNotice,
} from '@/components/admin/AuthCard';
import { MemberList } from '@/components/admin/MemberList';
import { findMemberByMembershipId, listMembers } from '@/server/admin/members';
import { requireAdmin } from '@/server/auth/admin-session';
import { normaliseMembershipId } from '@/server/auth/membership-id';
import { getDb } from '@/server/db';
import { lagosDate } from '@/server/time';
import { addMember } from './actions';

const ERRORS: Record<string, string> = {
  name: "Enter the member's name, up to 100 characters.",
  tier: 'Choose Basic or Premium.',
  expiry: 'Enter the expiry date as a real date.',
  expiry_past: 'That expiry date has already passed. Check the year.',
  phone: 'That does not look like a phone number. Use digits, spaces, + or dashes, or leave it blank.',
  busy: 'Could not save the member. Nothing was added. Try again.',
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; created?: string }>;
}) {
  await requireAdmin();
  const { e, created } = await searchParams;
  const db = getDb();

  let notice: AuthNotice | undefined;
  if (e && ERRORS[e]) {
    notice = { tone: 'error', text: ERRORS[e] };
  } else if (created) {
    // The banner only shows a member that exists, so an edited address cannot show a made-up ID.
    const id = normaliseMembershipId(created);
    const member = id ? await findMemberByMembershipId(db, id) : null;
    if (member) {
      notice = {
        tone: 'info',
        text: `Added ${member.name}. Membership ID ${member.membershipId}. Give this ID to the member. They need it to sign up.`,
      };
    }
  }

  const members = await listMembers(db);

  return (
    <AdminPage title="Members">
      {notice && <Notice notice={notice} />}
      <AdminSection title="Add a member">
        <Text>The system makes the membership ID. You will see it after you save.</Text>
        <Form action={addMember}>
          <TextField name="name" label="Full name" type="text" autoComplete="off" maxLength={100} />
          <SelectField
            name="tier"
            label="Tier"
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
            min={lagosDate()}
          />
          <TextField
            name="phone"
            label="Phone (optional)"
            type="tel"
            autoComplete="off"
            required={false}
            maxLength={20}
          />
          <SubmitButton>Add member</SubmitButton>
        </Form>
      </AdminSection>
      <AdminSection title="Members">
        <MemberList members={members} />
      </AdminSection>
    </AdminPage>
  );
}
