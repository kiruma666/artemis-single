/**
 * @Author: sheldon
 * @Date: 2024-06-06 23:34:19
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-06 23:38:10
 */

import {HydratedDocumentFromSchema, Schema, model} from 'mongoose';

import {USER_MODEL_NAME} from '../user/model';

const required = true;

export enum S3SignedUrlStatus {
    INITIALIZED = 'initialized',
    UPLOADED = 'uploaded',
    FAILED = 'failed'
}

const S3SignedUrl = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: USER_MODEL_NAME,
        required
    },

    key: {
        type: String,
        unique: true,
        required
    },
    region: {
        type: String,
        required
    },
    bucket: {
        type: String,
        required
    },

    folder: {
        type: String,
        required
    },
    fileName: {
        type: String,
        required
    },
    fileType: {
        type: String,
        required
    },

    status: {
        type: String,
        enum: Object.values(S3SignedUrlStatus),
        required
    },
}, {timestamps: true});

export const S3SignedUrlModel = model('s3_signed_url', S3SignedUrl);

export type S3SignedUrl = HydratedDocumentFromSchema<typeof S3SignedUrl>;
