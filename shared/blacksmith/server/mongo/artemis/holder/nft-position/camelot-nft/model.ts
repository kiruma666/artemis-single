/**
 * @Author: sheldon
 * @Date: 2024-02-07 07:24:18
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-29 23:38:01
 */

import {model, Schema} from 'mongoose';

const required = true;

const camelotNftPositionSchema = new Schema({
    holder: {
        type: String,
        required
    },
    camelotNftAmount: {
        type: String,
        required
    },
    poolAmount: {
        type: String,
        required
    }
});
const camelotNftDailyPostionSchema = new Schema({
    positions: {
        type: [camelotNftPositionSchema],
        required
    }
}, {
    timestamps: true
});

const camelotNftPositionModel = model('artemis_holder_camelot_nft_position', camelotNftDailyPostionSchema);

export default camelotNftPositionModel;
