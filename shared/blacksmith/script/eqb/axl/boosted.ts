/**
 * @Author: sheldon
 * @Date: 2024-01-08 23:04:39
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-01-09 10:20:03
 */

import fs from 'fs';

import BaseRewardPoolMeta from '@equilibria/contracts/artifacts/contracts/BaseRewardPool.sol/BaseRewardPool.json';
import {Contract, BigNumber} from 'ethers';

import {arbiProvider, retryableQueryFilter} from '@shared/blacksmith/server/mongo/quoll/util';

const rewardPoolAddress = '0x972eb68b0A9cf05a72AE48Dc9D086230304b0bEE';
const startBlock = 137999166; // pid 12 axl reward pool delpoyed
const endBlock = 153081977; // Nov-22-2023 10:56:33 PM +UTC
async function main() {
    const contract = new Contract(rewardPoolAddress, BaseRewardPoolMeta.abi, arbiProvider);
    const stakeLogs = [];
    const withdrawLogs = [];
    let fromBlock = startBlock;
    while (fromBlock <= endBlock) {
        // const toBlock = Math.min(fromBlock + maxBlockDiff, endBlock);
        const toBlock = endBlock;
        console.log({fromBlock, toBlock});
        const logs = await Promise.all([
            retryableQueryFilter({
                contract,
                eventName: 'Staked',
                fromBlock,
                toBlock
            }),
            retryableQueryFilter({
                contract,
                eventName: 'Withdrawn',
                fromBlock,
                toBlock
            })
        ]);
        if (logs[0]?.length) {
            stakeLogs.push(...logs[0]);
            console.log(logs[0]);
        }

        if (logs[1]?.length) {
            withdrawLogs.push(...logs[1]);
            console.log(logs[1]);
        }

        fs.writeFileSync('./logs.json', JSON.stringify({stakeLogs, withdrawLogs, toBlock}, null, 2));
        fromBlock = toBlock + 1;
    }

    const depositorMap: Record<string, BigNumber> = {};
    stakeLogs.forEach(({args: {_user, _amount}}: any) => {
        if (!depositorMap[_user]) {
            depositorMap[_user] = BigNumber.from(_amount);
        } else {
            depositorMap[_user] = depositorMap[_user].add(_amount);
        }
    });
    withdrawLogs.forEach(({args: {_user, _amount}}: any) => {
        if (!depositorMap[_user]) {
            depositorMap[_user] = BigNumber.from(_amount);
        } else {
            depositorMap[_user] = depositorMap[_user].sub(_amount);
        }
    });

    fs.writeFileSync('./axlDepositors.csv', Object.entries(depositorMap).flatMap(([user, amount]) => amount.isZero() ? [] : `${user},${amount.toString()}`).join('\n'));
}

main();
