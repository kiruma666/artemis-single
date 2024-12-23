/**
 * @Author: sheldon
 * @Date: 2024-06-06 23:39:38
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-07-14 12:34:56
 */

import {Verifier} from 'bip322-js';
import {ObjectId, ObjectIdLike} from 'bson';
import emojiRegexGen from 'emoji-regex';
import {Application} from 'express';

import {verifyRecaptcha} from '@shared/fe/server/util/google-recaptcha';

import {VerifyResult, verifyAndNotify} from 'server/bot/telegram';
import {API_LATEST_USERS_LIMIT, INTERNAL_API_PATH_PREFIX} from 'server/util/constant';
import {generateInviteCode} from 'server/util/invite-code';

import {S3SignedUrlModel, S3SignedUrlStatus} from '../aws-s3/model';
import {UserInviteCodeModel} from '../user-invite-code/model';
import {UserPointsModel} from '../user-points/model';

import {EligibleTelegramStatus, UserModel, findUserByWalletAddress, isTelegramGroupJoined, pickAndDeriveUserFields, pickPublicUserFields} from './model';

const numOfLatestUsers = Number(API_LATEST_USERS_LIMIT) || 7;

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

export function mountUser(app: Application) {
    const apiPath = '/api/user';
    const internalApiPath = `${INTERNAL_API_PATH_PREFIX}${apiPath}`;

    app.get(apiPath, async (req, res) => {
        const {walletAddress, userId} = req.query;
        if (!walletAddress && !userId) {
            return res.status(400).send('walletAddress is required');
        }

        try {
            let user = await UserModel.findOne(walletAddress ? {walletAddress} : {_id: userId});

            if (user?.telegram?.userId && !isTelegramGroupJoined(user)) {
                await verifyAndNotify({ // verify user here in case the group join event is missed
                    teleUserId: user.telegram.userId,
                    teleUsername: user.telegram.username,
                    walletAddress: user.walletAddress,
                    allowedResults: [VerifyResult.SUCCESS]
                });

                user = await UserModel.findOne({walletAddress}); // refresh user
            }

            if (!user) {
                return res.status(400).send('user not found');
            }

            const userInviteCode = await UserInviteCodeModel.findOne({userId: user._id}).sort({updatedAt: -1}).lean();
            if (!userInviteCode) {
                return res.status(500).send('invite code not found');
            }

            res.json(pickAndDeriveUserFields(user, userInviteCode.inviteCode));
        } catch (err) {
            console.error('[User][Get] failed', err);
            res.status(500).send('Error getting user');
        }
    });

    app.post([apiPath, internalApiPath], async (req, res) => {
        const {walletAddress, token, invitedBy} = req.body;
        if (!walletAddress) {
            return res.status(400).send('walletAddress is required');
        }

        try {
            if (req.path !== internalApiPath) { // skip recaptcha for internal creating user
                if (!token) {
                    return res.status(400).send('recaptcha token is required');
                }

                const verifyResult = await verifyRecaptcha(token);
                if (!verifyResult.success) {
                    console.log('[User][Create] recaptcha failed', verifyResult);

                    return res.status(400).send('recaptcha failed');
                }
            }

            // check if user exists
            const user = await UserModel.findOne({walletAddress});
            if (user) {
                return res.status(400).send('user already exists');
            }

            // check invitedBy validity
            if (invitedBy && !await UserInviteCodeModel.exists({inviteCode: invitedBy})) {
                return res.status(400).send('invalid invitation code');
            }

            const inviteCode = await generateInviteCode();
            const newUser = await UserModel.create({
                walletAddress,
                invitedBy: invitedBy || undefined
            });

            await UserInviteCodeModel.create({
                userId: newUser._id,
                inviteCode
            });

            res.json(pickAndDeriveUserFields(newUser, inviteCode));
        } catch (err) {
            console.error('[User][Create] failed', err);
            res.status(500).send('Error creating user');
        }
    });

    app.put([apiPath, internalApiPath], async (req, res) => {
        const {walletAddress, signature, message, nickname: nicknameFromReq, profileImageS3Key} = req.body;
        if (!walletAddress) {
            return res.status(400).send('walletAddress is required');
        }

        const nickname = nicknameFromReq?.trim();
        if (!nickname && !profileImageS3Key) {
            return res.status(400).send('nickname or profileImageS3Key is required');
        }

        if (req.path !== internalApiPath) { // skip signature for internal updating user
            if (!signature || !message) {
                return res.status(400).send('signature or message is missing!');
            }

            try {
                const {timestamp} = JSON.parse(message);
                if (Date.now() - new Date(timestamp).getTime() > 5 * 60e3) { // 5 minutes
                    console.warn('[User][Update] message expired', {walletAddress, message, signature});

                    return res.status(400).send('Signature expired');
                }
            } catch (err) {
                console.warn('[User][Update] invalid message', {walletAddress, message, signature});

                return res.status(400).send('Invalid message');
            }

            try {
                const isValidSignature = Verifier.verifySignature(walletAddress, message, signature);
                if (!isValidSignature) {
                    console.warn('[User][Update] invalid signature', {walletAddress, message, signature});

                    return res.status(400).send('Invalid signature');
                }
            } catch (err) {
                console.error('[User][Update] failed to verify signature', err);

                return res.status(500).send('Unsupported signature');
            }
        }

        try {
            const user = await findUserByWalletAddress(walletAddress);
            if (!user) {
                return res.status(400).send('user not found');
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

                return res.status(400).send(message);
            }

            user.nickname = nickname || user.nickname;
            user.profileImageS3Key = profileImageS3Key || user.profileImageS3Key;
            await user.save();

            res.json({success: true});
        } catch (err) {
            console.error('[User][Update] failed', err);

            return res.status(500).send('Error updating user');
        }
    });

    app.get(`${apiPath}/pre-update-check`, async (req, res) => {
        const {walletAddress, nickname} = req.query;

        try {
            if (walletAddress && typeof walletAddress !== 'string') {
                return res.status(400).send('Invalid walletAddress');
            }

            if (nickname) {
                if (typeof nickname !== 'string') {
                    return res.status(400).send('Invalid nickname');
                }

                const [isValid, message] = await isNicknameValid(nickname, walletAddress);
                if (!isValid) {
                    return res.json({message});
                }
            }

            res.json({success: true});
        } catch (err) {
            console.error('[User][Pre-Update-Check] failed', err);
            res.status(500).send('Internal Server Error');
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
            res.status(500).send('Error getting latest users');
        }
    });

    app.get(`${internalApiPath}/delete`, async (req, res) => {
        const {walletAddress} = req.query;
        if (!walletAddress) {
            return res.status(400).send('walletAddress is required');
        }

        try {
            const user = await UserModel.findOne({walletAddress});
            if (!user) {
                return res.status(400).send('user not found');
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
            res.status(500).send('Error deleting user');
        }
    });

    app.get(`${internalApiPath}/count`, async (req, res) => {
        try {
            const total = await UserModel.countDocuments();

            const totalInvited = await UserModel.countDocuments({invitedBy: {$exists: true}});
            const totalInvitedContributed = (await UserPointsModel.find({source: 'INVITE'}).distinct('metadata.contributorUserId')).length;

            const totalTwitterFollowing = await UserModel.countDocuments({'twitter.following': true});
            const totalTelegramGroupJoined = await UserModel.countDocuments({
                $or: [
                    {'telegram.status': {$in: EligibleTelegramStatus}},
                    {'telegram.status': 'restricted', 'telegram.is_member': true}
                ]
            });
            const totalEligibleForWhitelist = await UserModel.countDocuments({
                'twitter.following': true,
                '$or': [
                    {'telegram.status': {$in: EligibleTelegramStatus}},
                    {'telegram.status': 'restricted', 'telegram.is_member': true}
                ]
            });

            res.json({
                total,
                totalInvited,
                totalInvitedContributed,
                totalTwitterFollowing,
                totalTelegramGroupJoined,
                totalEligibleForWhitelist
            });
        } catch (err) {
            console.error('[User][Count] failed', err);
            res.status(500).send('Error counting users');
        }
    });
}
