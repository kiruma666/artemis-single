import path from 'path';

import {
    S3Client,
    PutObjectCommand
} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {Application, json} from 'express';
import {v7} from 'uuid';

import {getUrlByS3Key} from '@shared/fe/server/util/aws-s3';

import {findUserByWalletAddressIgnoreCase} from 'server/app/biubiujoy/mongo/user/model';
import {
    STAGE,
    BIU_AWS_REGION,
    BIU_AWS_BUCKET,
    BIU_AWS_ACCESS_KEY,
    BIU_AWS_SECRET_ACCESS_KEY
} from 'server/util/constant';

import {S3SignedUrlModel} from './model';

const ALLOWED_FOLDERS = [
    'user-profile'
];

export function mountBiuAwsS3(app: Application) {
    if (!BIU_AWS_REGION || !BIU_AWS_BUCKET || !BIU_AWS_ACCESS_KEY || !BIU_AWS_SECRET_ACCESS_KEY) {
        if (STAGE) {
            throw new Error('AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY are required');
        }

        console.error('[AWS] env keys missing, skip mount');

        return;
    }

    const s3Client = new S3Client({
        region: BIU_AWS_REGION,
        credentials: {
            accessKeyId: BIU_AWS_ACCESS_KEY,
            secretAccessKey: BIU_AWS_SECRET_ACCESS_KEY
        }
    });

    app.post('/api/biu/s3/signed-url', json(), async (req, res) => {
        const {fileName, fileType, folder, walletAddress} = req.body;
        console.log('[AWS] getSignedUrl', {fileName, fileType, folder, walletAddress});

        const fileExt = path.extname(fileName);
        if (!fileName || !fileExt || !fileType || !folder || !walletAddress || !ALLOWED_FOLDERS.includes(folder)) {
            return res.status(400).json({error: 'Bad Request'});
        }

        try {
            const user = await findUserByWalletAddressIgnoreCase(walletAddress);
            if (!user) {
                return res.status(400).json({error: 'Invalid wallet address'});
            }

            const Key = `${STAGE ?? 'dev'}/${folder}/${v7()}${fileExt}`;

            const Metadata = { // aws only support lowercase keys
                'filename': fileName,
                'filetype': fileType,
                folder,
                'user-id': user._id.toString(),
                'uploaded-at': new Date().toISOString()
            };

            const command = new PutObjectCommand({
                Bucket: BIU_AWS_BUCKET,
                Key,
                ContentType: fileType,
                Metadata
            });

            const signedUrl = await getSignedUrl(s3Client, command, {expiresIn: 60 * 2}); // 2 minutes
            const signedUrlRecord = await S3SignedUrlModel.create({
                userId: user._id,

                key: Key,
                region: BIU_AWS_REGION,
                bucket: BIU_AWS_BUCKET,

                folder,
                fileName,
                fileType,

                status: 'initialized'
            });

            res.json({
                id: signedUrlRecord._id,
                key: Key,
                url: getUrlByS3Key(Key),
                signedUrl
            });
        } catch (e) {
            console.error('[AWS] getSignedUrl error', e);

            res.status(500).json({error: 'Internal Server Error'});
        }
    });

    app.put('/api/biu/s3/signed-url', json(), async (req, res) => {
        const {id, status} = req.body;
        console.log('[AWS] updateSignedUrl', {id, status});

        if (!id || !status) {
            return res.status(400).json({error: 'Bad Request'});
        }

        try {
            const signedUrlRecord = await S3SignedUrlModel.findById(id);
            if (!signedUrlRecord) {
                return res.status(400).json({error: 'Invalid id'});
            }

            signedUrlRecord.status = status;
            await signedUrlRecord.save();

            res.json({
                id: signedUrlRecord._id,
                status: signedUrlRecord.status
            });
        } catch (e) {
            console.error('[AWS] updateSignedUrl error', e);

            res.status(500).json({error: 'Internal Server Error'});
        }
    });
}
