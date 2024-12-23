import {job} from 'cron';

import {sendAlertMessage} from 'server/bot/telegram';
import {syncUserPoints} from 'server/mongo/user-points/service';
import {CRON_SYNC_USER_LOCK_POINTS} from 'server/util/constant';
import {getAllUsersOfLock} from 'server/util/whitelist-api';

async function syncAllUsersLockPoints() {
    const {data: resBody} = await getAllUsersOfLock();
    if (!resBody?.data.length) {
        sendAlertMessage('[Cron][UserPoints][syncAllUsersLockPoints] no users found');

        return;
    }

    const allAddresses = new Set(resBody.data.map(user => user.from_btc_address));
    sendAlertMessage(`[Cron][UserPoints][syncAllUsersLockPoints] fetched ${resBody.data.length}, unique ${allAddresses.size}`);

    for (const address of allAddresses) {
        console.log(`[Cron][UserPoints][syncAllUsersLockPoints] syncing: ${address}`);
        await syncUserPoints(address, ['LOCK']);
        console.log(`[Cron][UserPoints][syncAllUsersLockPoints] synced: ${address}`);
    }
}

if (CRON_SYNC_USER_LOCK_POINTS) {
    job({
        cronTime: CRON_SYNC_USER_LOCK_POINTS,
        start: true,
        onTick: async () => {
            try {
                sendAlertMessage('[Cron][UserPoints][syncAllUsersLockPoints] started');
                await syncAllUsersLockPoints();
                sendAlertMessage('[Cron][UserPoints][syncAllUsersLockPoints] completed');
            } catch (e: any) {
                console.error('[Cron][UserPoints][syncAllUsersLockPoints] error:', e);
                sendAlertMessage(`[Cron][UserPoints][syncAllUsersLockPoints] error: ${e.message}`);
            }
        },
    });
}
