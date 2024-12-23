/**
 * @Author: sheldon
 * @Date: 2024-02-07 07:24:18
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-10-12 09:45:17
 */

import {model, Schema} from 'mongoose';

const required = true;

const ePendleBalanceSchema = new Schema({
    holder: {
        type: String,
        required
    },
    eth: {
        type: String,
        required
    },
    ethStaked: {
        type: String,
        required
    },
    ethCompounderStaked: {
        type: String,
        required
    },
    arb: {
        type: String,
        required
    },
    arbStaked: {
        type: String,
        required
    },
    arbBridge: {
        type: String,
        default: '0'
    },
    arbBridgeStaked: {
        type: String,
        required
    },
    arbCompounderStaked: {
        type: String,
        required
    },
    op: {
        type: String,
        required
    },
    opStaked: {
        type: String,
        required
    },
    bnb: {
        type: String,
        required
    },
    bnbStaked: {
        type: String,
        required
    }
});

const ePendleDailyBalanceSchema = new Schema({
    balances: {
        type: [ePendleBalanceSchema],
        required
    }
}, {
    timestamps: true
});

const ePendleBalanceModel = model('euclid_holder_e_pendle_daily_balance', ePendleDailyBalanceSchema);

export default ePendleBalanceModel;
