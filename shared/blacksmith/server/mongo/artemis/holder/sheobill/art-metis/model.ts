/**
 * @Author: sheldon
 * @Date: 2024-04-28 21:35:27
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-04-28 23:10:09
 */

import {model, Schema} from 'mongoose';

const required = true;

const artMetisBalanceSchema = new Schema({
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
const artMetisDailyBalanceSchema = new Schema({
    balances: {
        type: [artMetisBalanceSchema],
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

const ShoebillArtMetisBalanceModel = model('artemis_holder_sheobill_art_metis_daily_balance', artMetisDailyBalanceSchema);

export default ShoebillArtMetisBalanceModel;
