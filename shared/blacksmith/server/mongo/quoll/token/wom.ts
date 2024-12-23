/*
 * @Author: xiaodongyu
 * @Date: 2022-10-14 15:10:38
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-10-14 15:23:33
 */

import {model} from 'mongoose';

import createToken from './base';
import tokenSchema from './scheme';

const womTokenScript = createToken({
    name: 'wom-holder',
    address: '0xad6742a35fb341a9cc6ad674738dd8da98b94fb1',
    creationBlock: 20636006,
    description: 'wom token'
}, model('womTransfer', tokenSchema));

export default womTokenScript;
