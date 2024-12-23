/*
 * @Author: xiaodongyu
 * @Date: 2022-10-12 19:26:39
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-10-13 19:27:34
 */

import {Schema, model} from 'mongoose';

const AddressModel = model('Address', new Schema({
    address: {
        type: String,
        required: true,
        unique: true
    },
    isContract: {
        type: Boolean,
        default: false
    }
}));

export default AddressModel;
