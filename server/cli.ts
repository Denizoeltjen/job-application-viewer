// User administration, run inside the container:
//   node server/cli.ts add <username> [password]   (random password if omitted)
//   node server/cli.ts passwd <username> [password]
//   node server/cli.ts remove <username>
//   node server/cli.ts list
import { randomBytes } from 'node:crypto';
import { hashPassword } from './auth.ts';
import { db } from './db.ts';

const [command, username, givenPassword] = process.argv.slice(2);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function passwordOrGenerated(): { password: string; generated: boolean } {
  if (givenPassword) {
    if (givenPassword.length < 10) fail('Password must be at least 10 characters.');
    return { password: givenPassword, generated: false };
  }
  return { password: randomBytes(15).toString('base64url'), generated: true };
}

switch (command) {
  case 'add': {
    if (!username) fail('Usage: add <username> [password]');
    const { password, generated } = passwordOrGenerated();
    try {
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, await hashPassword(password));
    } catch {
      fail(`User "${username}" already exists.`);
    }
    console.log(`Created user "${username}".${generated ? ` Password: ${password}` : ''}`);
    break;
  }
  case 'passwd': {
    if (!username) fail('Usage: passwd <username> [password]');
    const { password, generated } = passwordOrGenerated();
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number } | undefined;
    if (!user) fail(`No user "${username}".`);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(password), user.id);
    // A password change should end every existing login for that account.
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    console.log(`Updated password for "${username}".${generated ? ` Password: ${password}` : ''}`);
    break;
  }
  case 'remove': {
    if (!username) fail('Usage: remove <username>');
    const { changes } = db.prepare('DELETE FROM users WHERE username = ?').run(username);
    if (!changes) fail(`No user "${username}".`);
    console.log(`Removed user "${username}" and all of their data.`);
    break;
  }
  case 'list': {
    const rows = db.prepare('SELECT username, created_at FROM users ORDER BY username').all() as {
      username: string;
      created_at: string;
    }[];
    if (!rows.length) console.log('No users yet.');
    for (const r of rows) console.log(`${r.username}\t(created ${r.created_at})`);
    break;
  }
  default:
    fail('Commands: add <username> [password] | passwd <username> [password] | remove <username> | list');
}
