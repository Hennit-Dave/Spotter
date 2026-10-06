import type { MemberRow } from '@/server/admin/members';
import { Text } from './AuthCard';
import styles from './AdminPage.module.css';

const expiryFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function MemberList({ members }: { members: MemberRow[] }) {
  if (members.length === 0) {
    return <Text>No members yet. Add the first one above.</Text>;
  }
  return (
    <ul className={styles.list}>
      {members.map((member) => (
        <li key={member.id} className={styles.item}>
          <p className={styles.itemName}>{member.name}</p>
          <p className={styles.itemMeta}>Membership ID {member.membershipId}</p>
          <p className={styles.itemMeta}>
            {member.tier === 'PREMIUM' ? 'Premium' : 'Basic'}, expires{' '}
            {expiryFormat.format(member.expiryDate)}
          </p>
          {member.phone && <p className={styles.itemMeta}>{member.phone}</p>}
        </li>
      ))}
    </ul>
  );
}
