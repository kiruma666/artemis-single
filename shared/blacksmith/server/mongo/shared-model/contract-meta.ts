/*
 * @Author: xiaodongyu
 * @Date: 2022-10-14 11:19:26
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-10-14 11:22:09
 */

import {Schema, model} from 'mongoose';

const ContractMetaModel = model('ContractMeta', new Schema({
    address: {
        type: String,
        required: true,
        unique: true
    },
    nextCrawlBlock: {
        type: Number,
        required: true
    }
}));

export default ContractMetaModel;
