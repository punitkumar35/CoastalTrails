import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  // Add one-time cron to dump ps aux
  const cronRes = await cp.uapi('Cron', 'add_line', {
    command: '/bin/ps -u coastaee -o pid,ppid,%cpu,%mem,etime,cmd > /home2/coastaee/ps_output.txt 2>&1',
    minute: '*',
    hour: '*',
    day: '*',
    month: '*',
    weekday: '*'
  });
  console.log('Cron add result:', JSON.stringify(cronRes));
}

main().catch(console.error);
