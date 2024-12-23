/*
 * @Author: xiaodongyu
 * @Date: 2023-01-30 21:24:41
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-09 16:38:03
 */

import {BigNumber} from 'ethers';
import {model} from 'mongoose';

import AddressMap from '@quoll/frontend/src/contract/address-stake-lp.json';

import {getBlockRangeFilter, tokenSelf} from '../util';
import createToken from './base';
import tokenSchema from './scheme';

const {log} = console;
const {zap} = AddressMap['56'];
const usdtModel = model('usdtTransfer', tokenSchema);
const usdtTransferScript = createToken({
    name: 'usdtTransferScript',
    address: '0x55d398326f99059fF775485246999027B3197955',
    creationBlock: 25235138, // blockNumber at Jan-30-2023 01:26:20 PM +UTC
    description: 'usdt token',
    customMaxBlockDiff: 50,
    filterDoc(doc) {
        return doc.to === zap;
    }
}, usdtModel);

usdtTransferScript.calculate = async args => {
    const logs = await usdtModel.find(getBlockRangeFilter(args)).lean();
    const ten = BigNumber.fromDecimal('10');
    const depositorMap: Record<string, BigNumber> = {};
    logs.forEach(({from, to, value}: any) => {
        if (from !== tokenSelf && to === zap) {
            if (!depositorMap[from]) {
                depositorMap[from] = BigNumber.from(value);
            } else {
                depositorMap[from] = depositorMap[from].add(value);
            }
        }
    });

    const validDepositors = Object.entries(depositorMap).flatMap(([userAccount, amount]) => amount.gte(ten) ? userAccount : []);

    log('At least 10 usdt depositors count:', validDepositors.length);

    return validDepositors;
};

export default usdtTransferScript;
