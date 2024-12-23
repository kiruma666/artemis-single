/**
 * @Author: sheldon
 * @Date: 2024-04-28 21:35:27
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-04-28 23:26:22
 */

import {model, Schema} from 'mongoose';

const required = true;

const metisBalanceSchema = new Schema({
    holder: {
        type: String,
        required
    },
    balance: {
        type: String,
        required
    },
    cash: {
        type: String,
        required
    }
});
const metisDailyBalanceSchema = new Schema({
    balances: {
        type: [metisBalanceSchema],
        required
    },
    totalSupply: {
        type: String,
        required
    },
    totalCash: {
        type: String,
        required
    }
}, {
    timestamps: true
});

const ShoebillMetisBalanceModel = model('artemis_holder_sheobill_metis_daily_balance', metisDailyBalanceSchema);

export default ShoebillMetisBalanceModel;
