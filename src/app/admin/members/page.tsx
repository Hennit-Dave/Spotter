import { AdminPage, AdminSection } from '@/components/admin/AdminPage';
import { MemberList } from '@/components/admin/MemberList';
import { listMembers } from '@/server/admin/members';
import { requireAdmin } from '@/server/auth/admin-session';
import { getDb } from '@/server/db';

// Members make themselves by signing up, so this screen only lists them (FR-13 is removed).
export default async function AdminMembersPage() {
  await requireAdmin();
  const members = await listMembers(getDb());

  return (
    <AdminPage title="Members">
      <AdminSection title="Members">
        <MemberList members={members} />
      </AdminSection>
    </AdminPage>
  );
}
