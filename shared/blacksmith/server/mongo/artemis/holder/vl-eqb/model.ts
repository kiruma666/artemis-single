/**
 * @Author: sheldon
 * @Date: 2024-02-07 07:24:18
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-01 22:41:17
 */

import {model, Schema} from 'mongoose';

const required = true;

const vlEqbBalanceSchema = new Schema({
    holder: {
        type: String,
        required
    },
    eth: {
        type: String,
        required
    },
    arb: {
        type: String,
        required
    },
    op: {
        type: String,
        required
    },
    bnb: {
        type: String,
        required
    }
});
const vlEqbDailyBalanceSchema = new Schema({
    balances: {
        type: [vlEqbBalanceSchema],
        required
    }
}, {
    timestamps: true
});

const vlEqbBalanceModel = model('artemis_holder_vl_eqb_daily_balance', vlEqbDailyBalanceSchema);

export default vlEqbBalanceModel;
