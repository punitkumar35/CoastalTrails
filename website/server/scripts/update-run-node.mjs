import { CPanelClient } from './cpanel-client.mjs';

async function main() {
  const cp = new CPanelClient('66.116.209.42', 'coastaee', 'Mithila2206@#');
  await cp.login();
  console.log('Logged into cPanel.');

  const runNodeSh = `#!/bin/bash
export PATH="/home2/coastaee/nodejs/bin:/usr/local/bin:/usr/bin:/bin"
export PORT=3458
export NODE_ENV=production

cd /home2/coastaee/app

# Keep log under 2MB
if [ -f /home2/coastaee/app/app.log ]; then
    log_size=$(wc -c < /home2/coastaee/app/app.log 2>/dev/null || echo 0)
    if [ "$log_size" -gt 2097152 ]; then
        tail -n 2000 /home2/coastaee/app/app.log > /home2/coastaee/app/app.log.tmp 2>/dev/null
        mv /home2/coastaee/app/app.log.tmp /home2/coastaee/app/app.log 2>/dev/null
    fi
fi

# Check if port 3458 is responding with a 3-second timeout
if ! /usr/bin/curl -s -m 3 http://127.0.0.1:3458/api/health > /dev/null 2>&1; then
    echo "[$(date -u)] Port 3458 offline, restarting node..." >> /home2/coastaee/app/cron.log
    /usr/bin/pkill -9 -u coastaee -f "node.*index.js" 2>/dev/null
    sleep 0.5
    nohup /home2/coastaee/nodejs/bin/node --max-old-space-size=256 index.js </dev/null >> /home2/coastaee/app/app.log 2>&1 &
fi
`;

  await cp.saveFile('', 'run_node.sh', runNodeSh);
  console.log('Saved optimized run_node.sh');
}

main().catch(console.error);
