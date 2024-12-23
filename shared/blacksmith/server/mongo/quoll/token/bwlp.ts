/*
 * @Author: xiaodongyu
 * @Date: 2022-10-14 15:19:16
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-10-14 18:06:25
 */

import {model} from 'mongoose';

import createToken from './base';
import tokenSchema from './scheme';

const bwlpTokenScript = createToken({
    name: 'bwlp-holder',
    address: '0xe68D05418A8d7969D9CA6761ad46F449629d928c',
    creationBlock: 20720983,
    description: 'busd/wom lp token'
}, model('bwlpTransfer', tokenSchema), true);

export default bwlpTokenScript;
