/*
 * @Author: xiaodongyu
 * @Date: 2023-01-30 21:24:41
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-09 16:58:23
 */

import {BigNumber} from 'ethers';
import {model} from 'mongoose';

import AddressMap from '@quoll/frontend/src/contract/address-stake-lp.json';

import {getBlockRangeFilter, tokenSelf} from '../util';
import createToken from './base';
import tokenSchema from './scheme';

const {log} = console;
const {zap} = AddressMap['56'];
const usdcModel = model('usdcTransfer', tokenSchema);
const usdcTransferScript = createToken({
    name: 'usdcTransferScript',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    creationBlock: 25235138, // blockNumber at Jan-30-2023 01:26:20 PM +UTC
    description: 'usdc token',
    customMaxBlockDiff: 50,
    filterDoc(doc) {
        return doc.to === zap;
    }
}, usdcModel);

usdcTransferScript.calculate = async args => {
    const logs = await usdcModel.find(getBlockRangeFilter(args)).lean();
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

    log('At least 10 usdc depositors count:', validDepositors.length);

    return validDepositors;
};

export default usdcTransferScript;
