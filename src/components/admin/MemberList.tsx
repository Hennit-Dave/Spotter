import type { MemberRow } from '@/server/admin/members';
import { Text } from './AuthCard';
import styles from './AdminPage.module.css';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function planLine(member: MemberRow): string {
  if (member.plan === 'PAID' && member.paidThrough) {
    return `Paid, through ${dateFormat.format(new Date(`${member.paidThrough}T00:00:00Z`))}`;
  }
  if (member.paidThrough) {
    return `Free, paid time ended ${dateFormat.format(new Date(`${member.paidThrough}T00:00:00Z`))}`;
  }
  return 'Free';
}

function balanceLine(member: MemberRow): string {
  if (member.openingBalanceSet) return 'Opening balance set';
  return member.claimsExistingMember
    ? 'Says they are already a member. Opening balance not entered yet'
    : 'Opening balance not set';
}

export function MemberList({ members }: { members: MemberRow[] }) {
  if (members.length === 0) {
    return <Text>No members yet. Members appear here when they verify their email.</Text>;
  }
  return (
    <ul className={styles.list}>
      {members.map((member) => (
        <li key={member.id} className={styles.item}>
          <p className={styles.itemName}>{member.name}</p>
          <p className={styles.itemMeta}>Membership ID {member.membershipId}</p>
          <p className={styles.itemMeta}>{planLine(member)}</p>
          <p className={styles.itemMeta}>{balanceLine(member)}</p>
          <p className={styles.itemMeta}>
            {member.accessCardIssued ? 'Access card issued' : 'No access card recorded'}
          </p>
          {member.phone && <p className={styles.itemMeta}>{member.phone}</p>}
        </li>
      ))}
    </ul>
  );
}
