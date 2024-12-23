/**
 * @Author: sheldon
 * @Date: 2024-06-06 23:39:38
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-07-14 12:34:56
 */

import {Verifier} from 'bip322-js';
import {ObjectId, ObjectIdLike} from 'bson';
import emojiRegexGen from 'emoji-regex';
import {Application, json} from 'express';

import {verifyRecaptcha} from '@shared/fe/server/util/google-recaptcha';

import {generateBiuUserInviteCode} from 'server/mongo/shared-model/counter';
import {BIU_API_LATEST_USERS_LIMIT, INTERNAL_API_PATH_PREFIX} from 'server/util/constant';

import {S3SignedUrlModel, S3SignedUrlStatus} from '../aws-s3/model';
import {UserInviteCodeModel} from '../user-invite-code/model';
import {UserPointsModel} from '../user-points/model';

import {EligibleTelegramStatus, UserModel, findUserByWalletAddressIgnoreCase, pickAndDeriveUserFields, pickPublicUserFields} from './model';

const numOfLatestUsers = Number(BIU_API_LATEST_USERS_LIMIT) || 7;

const emojiRegex = new RegExp(emojiRegexGen().source); // strip the g flag
const isNicknameValid = async (nickname: string, walletAddress?: string): Promise<[false, string] | [true]> => {
    if (nickname.length > 30) {
        return [false, 'The nickname should not exceed 30 characters.'];
    }

    if (emojiRegex.test(nickname)) {
        return [false, 'The nickname should not contain emoji.'];
    }

    const isNicknameTaken = !!(await UserModel.exists({nickname, walletAddress: {$ne: walletAddress}}));
    if (isNicknameTaken) {
        return [false, 'Nickname already taken.'];
    }

    return [true];
};

const isProfileImageS3KeyValid = async (profileImageS3Key: string, userId: ObjectId | ObjectIdLike | string): Promise<[false, string] | [true]> => {
    const signedUrlRecord = await S3SignedUrlModel.findOne({key: profileImageS3Key});
    if (!signedUrlRecord || !signedUrlRecord.userId.equals(userId) || signedUrlRecord.status !== S3SignedUrlStatus.UPLOADED) {
        return [false, 'Invalid profileImageS3Key.'];
    }

    return [true];
};

export function mountBiuUser(app: Application) {
    const apiPath = '/api/biu/user';
    const internalApiPath = `${INTERNAL_API_PATH_PREFIX}${apiPath}`;

    app.get(apiPath, async (req, res) => {
        const {walletAddress, userId} = req.query;
        if (!walletAddress && !userId) {
            return res.status(400).json({error: 'walletAddress is required'});
        }

        try {
            const user = await (walletAddress ? findUserByWalletAddressIgnoreCase(walletAddress as string) : UserModel.findOne({_id: userId}));
            if (!user) {
                return res.status(400).json({error: 'user not found'});
            }

            const userInviteCode = await UserInviteCodeModel.findOne({userId: user._id}).sort({updatedAt: -1}).lean();
            if (!userInviteCode) {
                return res.status(500).json({error: 'invite code not found'});
            }

            res.json({userInfo: pickAndDeriveUserFields(user, userInviteCode.inviteCode)});
        } catch (err) {
            console.error('[User][Get] failed', err);
            res.status(500).json({error: 'Error getting user'});
        }
    });

    app.post([apiPath, internalApiPath], json(), async (req, res) => {
        const {walletAddress, token, invitedBy} = req.body;
        if (!walletAddress) {
            return res.status(400).json({error: 'walletAddress is required'});
        }

        try {
            if (req.path !== internalApiPath) { // skip recaptcha for internal creating user
                if (!token) {
                    return res.status(400).json({error: 'recaptcha token is required'});
                }

                const verifyResult = await verifyRecaptcha(token);
                if (!verifyResult.success) {
                    console.log('[User][Create] recaptcha failed', verifyResult);

                    return res.status(400).json({error: 'recaptcha failed'});
                }
            }

            // check if user exists
            const user = await findUserByWalletAddressIgnoreCase(walletAddress);
            if (user) {
                return res.status(400).json({error: 'user already exists'});
            }

            // check invitedBy validity
            if (invitedBy && !await UserInviteCodeModel.exists({inviteCode: invitedBy})) {
                return res.status(400).json({error: 'invalid invitation code'});
            }

            const inviteCode = await generateBiuUserInviteCode();
            const newUser = await UserModel.create({
                walletAddress,
                invitedBy: invitedBy || undefined
            });

            await UserInviteCodeModel.create({
                userId: newUser._id,
                inviteCode
            });

            res.json({userInfo: pickAndDeriveUserFields(newUser, inviteCode)});
        } catch (err) {
            console.error('[User][Create] failed', err);
            res.status(500).json({error: 'Error creating user'});
        }
    });

    app.put([apiPath, internalApiPath], json(), async (req, res) => {
        const {walletAddress, signature, message, nickname: nicknameFromReq, profileImageS3Key} = req.body;
        if (!walletAddress) {
            return res.status(400).json({error: 'walletAddress is required'});
        }

        const nickname = nicknameFromReq?.trim();
        if (!nickname && !profileImageS3Key) {
            return res.status(400).json({error: 'nickname or profileImageS3Key is required'});
        }

        if (req.path !== internalApiPath) { // skip signature for internal updating user
            if (!signature || !message) {
                return res.status(400).json({error: 'signature or message is missing!'});
            }

            try {
                const {timestamp} = JSON.parse(message);
                if (Date.now() - new Date(timestamp).getTime() > 5 * 60e3) { // 5 minutes
                    console.warn('[User][Update] message expired', {walletAddress, message, signature});

                    return res.status(400).json({error: 'Signature expired'});
                }
            } catch (err) {
                console.warn('[User][Update] invalid message', {walletAddress, message, signature});

                return res.status(400).json({error: 'Invalid message'});
            }

            try {
                const isValidSignature = Verifier.verifySignature(walletAddress, message, signature);
                if (!isValidSignature) {
                    console.warn('[User][Update] invalid signature', {walletAddress, message, signature});

                    return res.status(400).json({error: 'Invalid signature'});
                }
            } catch (err) {
                console.error('[User][Update] failed to verify signature', err);

                return res.status(500).json({error: 'Unsupported signature'});
            }
        }

        try {
            const user = await findUserByWalletAddressIgnoreCase(walletAddress);
            if (!user) {
                return res.status(400).json({error: 'user not found'});
            }

            if (user.nickname === nickname && user.profileImageS3Key === profileImageS3Key) {
                // already up-to-date
                return res.json({success: true});
            }

            const validations = await Promise.all([
                nickname && isNicknameValid(nickname, walletAddress),
                profileImageS3Key && isProfileImageS3KeyValid(profileImageS3Key, user._id)
            ].filter(Boolean));

            if (validations.some(([isValid]) => !isValid)) {
                const [, message] = validations.find(([isValid]) => !isValid) || [];

                return res.status(400).json({error: message});
            }

            user.nickname = nickname || user.nickname;
            user.profileImageS3Key = profileImageS3Key || user.profileImageS3Key;
            await user.save();

            res.json({success: true});
        } catch (err) {
            console.error('[User][Update] failed', err);

            return res.status(500).json({error: 'Error updating user'});
        }
    });

    app.get(`${apiPath}/pre-update-check`, async (req, res) => {
        const {walletAddress, nickname} = req.query;

        try {
            if (walletAddress && typeof walletAddress !== 'string') {
                return res.status(400).json({error: 'Invalid walletAddress'});
            }

            if (nickname) {
                if (typeof nickname !== 'string') {
                    return res.status(400).json({error: 'Invalid nickname'});
                }

                const [isValid, message] = await isNicknameValid(nickname, walletAddress);
                if (!isValid) {
                    return res.json({message});
                }
            }

            res.json({success: true});
        } catch (err) {
            console.error('[User][Pre-Update-Check] failed', err);
            res.status(500).json({error: 'Internal Server Error'});
        }
    });

    app.get(`${apiPath}/latest`, async (req, res) => {
        try {
            const latestUsers = await UserModel.find().sort({createdAt: -1}).limit(numOfLatestUsers);
            const invitedBys = latestUsers.map(user => user.invitedBy).filter(Boolean);

            const inviteCodes = await UserInviteCodeModel.find({inviteCode: {$in: invitedBys}});
            const inviters = await UserModel.find({_id: {$in: inviteCodes.map(inviteCode => inviteCode.userId)}});

            const data = {
                total: latestUsers.length,
                list: latestUsers.map(user => {
                    const inviterUserId = inviteCodes.find(inviteCode => inviteCode.inviteCode === user.invitedBy)?.userId;
                    const inviter = inviterUserId && inviters.find(inviter => inviter._id.equals(inviterUserId));

                    return {
                        user: pickPublicUserFields(user),
                        inviter: inviter && pickPublicUserFields(inviter)
                    };
                })
            };

            res.json(data);
        } catch (err) {
            console.error('[User][Latest] failed', err);
            res.status(500).json({error: 'Error getting latest users'});
        }
    });

    app.get(`${internalApiPath}/delete`, async (req, res) => {
        const {walletAddress} = req.query;
        if (!walletAddress) {
            return res.status(400).json({error: 'walletAddress is required'});
        }

        try {
            const user = await findUserByWalletAddressIgnoreCase(walletAddress as string);
            if (!user) {
                return res.status(400).json({error: 'user not found'});
            }

            const {deletedCount: pointsDeleted} = await UserPointsModel.deleteMany({userId: user._id});
            const {deletedCount: contributedPointsDeleted} = await UserPointsModel.deleteMany({'metadata.contributorUserId': user._id});
            const {deletedCount} = await UserModel.deleteOne({_id: user._id});

            res.json({
                success: deletedCount === 1,
                pointsDeleted,
                contributedPointsDeleted
            });
        } catch (err) {
            console.error('[User][Delete] failed', err);
            res.status(500).json({error: 'Error deleting user'});
        }
    });

    app.get(`${internalApiPath}/count`, async (req, res) => {
        try {
            const total = await UserModel.countDocuments();

            const totalInvited = await UserModel.countDocuments({invitedBy: {$exists: true}});

            const totalTwitterFollowing = await UserModel.countDocuments({'twitter.following': true});
            const totalTelegramGroupJoined = await UserModel.countDocuments({
                $or: [
                    {'telegram.status': {$in: EligibleTelegramStatus}},
                    {'telegram.status': 'restricted', 'telegram.is_member': true}
                ]
            });

            res.json({
                total,
                totalInvited,
                totalTwitterFollowing,
                totalTelegramGroupJoined,
            });
        } catch (err) {
            console.error('[User][Count] failed', err);
            res.status(500).json({error: 'Error counting users'});
        }
    });
}
