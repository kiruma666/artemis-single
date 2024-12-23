/**
 * @Author: sheldon
 * @Date: 2024-02-10 22:27:51
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-26 23:39:24
 */

import {Schema, model} from 'mongoose';

const required = true;

const artMetisTransferSchema = new Schema({
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
    from: {
        type: String,
        required
    },
    to: {
        type: String,
        required
    },
    value: {
        type: String,
        required
    }
});

const ArtMetisTransferModel = model('artemis_art_metis_transfer', artMetisTransferSchema);

export default ArtMetisTransferModel;
