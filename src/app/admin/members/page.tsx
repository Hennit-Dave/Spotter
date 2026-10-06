import { randomUUID } from 'node:crypto';
import { AdminPage, AdminSection } from '@/components/admin/AdminPage';
import { AddMemberForm } from '@/components/admin/AddMemberForm';
import { MemberList } from '@/components/admin/MemberList';
import { listMembers } from '@/server/admin/members';
import { requireAdmin } from '@/server/auth/admin-session';
import { getDb } from '@/server/db';

export default async function AdminMembersPage() {
  await requireAdmin();
  const members = await listMembers(getDb());

  return (
    <AdminPage title="Members">
      <AdminSection title="Add a member">
        <AddMemberForm initialKey={randomUUID()} />
      </AdminSection>
      <AdminSection title="Members">
        <MemberList members={members} />
      </AdminSection>
    </AdminPage>
  );
}
