/**
 * @Author: sheldon
 * @Date: 2023-11-05 20:06:20
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-11-05 20:10:33
 */

import {Schema, model} from 'mongoose';

const required = true;

const eqbChainInfoModel = model('eqbChainInfo', new Schema({
    cache: {
        type: Schema.Types.Mixed,
        required
    }
}, {
    timestamps: true
}));

export default eqbChainInfoModel;
