/*
 * @Author: xiaodongyu
 * @Date: 2022-10-13 10:59:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-12-02 19:26:34
 */

import {Schema, model} from 'mongoose';

const required = true;

const wombatBoosterModel = model('wombatBooster', new Schema({
    blockNumber: {
        type: Number,
        required
    },
    transactionHash: {
        type: String,
        required
    },
    transactionFrom: {
        type: String,
        default: ''
    },
    event: {
        type: String,
        default: '',
    },
    user: {
        type: String,
        required
    },
    poolid: {
        type: Number,
        required
    },
    amount: {
        type: String,
        required
    }
}));

export default wombatBoosterModel;
