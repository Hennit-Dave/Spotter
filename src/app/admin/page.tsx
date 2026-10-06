import { AuthCard, Form, NavLink, SubmitButton, Text } from '@/components/admin/AuthCard';
import { requireAdmin } from '@/server/auth/admin-session';
import { signOut } from './actions';

export default async function AdminHomePage() {
  const staff = await requireAdmin();
  return (
    <AuthCard title="Spotter desk">
      <Text>
        Signed in as {staff.name}, {staff.role === 'OWNER' ? 'owner' : 'staff'}.
      </Text>
      <NavLink href="/admin/members">Members</NavLink>
      <Form action={signOut}>
        <SubmitButton>Sign out</SubmitButton>
      </Form>
    </AuthCard>
  );
}
