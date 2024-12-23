/**
 * @Author: sheldon
 * @Date: 2024-02-10 22:27:51
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-02-28 22:57:45
 */

import {Schema, model} from 'mongoose';

const required = true;

const euclidAssetDepositorSchema = new Schema({
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
    user: {
        type: String,
        required
    },
    asset: {
        type: String,
        required
    },
    amount: {
        type: String,
        required
    },
    elETHAmount: {
        type: String,
        required
    },
    referralId: {
        type: String,
        // required
    }
});

// euclidAssetDepositorSchema.index({transactionHash: 1, logIndex: 1}, {unique: true});

const EuclidAssetDepositorModel = model('euclid_asset_depositor_event', euclidAssetDepositorSchema);

export default EuclidAssetDepositorModel;
