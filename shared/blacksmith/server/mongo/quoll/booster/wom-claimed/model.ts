/*
 * @Author: xiaodongyu
 * @Date: 2022-10-13 10:59:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-12-24 16:55:51
 */

import {Schema, model} from 'mongoose';

const required = true;

const wombatBoosterWomClaimedModel = model('wombatBoosterWomClaimed', new Schema({
    blockNumber: {
        type: Number,
        required
    },
    transactionHash: {
        type: String,
        required
    },
    event: {
        type: String,
        default: '',
    },
    pid: {
        type: Number,
        required
    },
    amount: {
        type: String,
        required
    }
}));

export default wombatBoosterWomClaimedModel;
