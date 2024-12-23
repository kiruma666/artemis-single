/**
 * @Author: sheldon
 * @Date: 2024-05-05 23:11:30
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-05 23:19:24
 */

import {Schema, model} from 'mongoose';

const required = true;

const OperatorPointSchema = new Schema({
    user: {
        type: String,
        required
    },
    ePoints: {
        type: Number,
        required
    },
    myShare: {
        type: Number,
        required
    },
    dailyPoints: {
        type: Number,
        required
    }
});

const AssetEthPriceSchema = new Schema({
    asset: {
        type: String,
        required
    },
    price: {
        type: Number,
        required
    }
});

const euclidOperatorPointsSchema = new Schema({
    points: {
        type: [OperatorPointSchema],
        required
    },
    prices: {
        type: [AssetEthPriceSchema],
        required
    }
}, {timestamps: true});

export default model('euclid_operator_points', euclidOperatorPointsSchema);
