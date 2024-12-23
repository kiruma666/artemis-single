/*
 * @Author: xiaodongyu
 * @Date: 2022-10-14 15:10:38
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-12-13 09:24:12
 */

import {model} from 'mongoose';

import AddressMap from '@quoll/frontend/src/contract/address-stake-lp.json';

import createToken from './base';
import tokenSchema from './scheme';

export const quoTransferModel = model('quoTransfer', tokenSchema);

const quoTokenScript = createToken({
    name: 'quo-transfer',
    address: AddressMap[56].quo,
    creationBlock: 21347743,
    description: 'quoll token'
}, quoTransferModel);

export default quoTokenScript;
