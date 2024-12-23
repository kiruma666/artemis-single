import {Application, json} from 'express';

import {isValidWalletAddress} from '@shared/fe/util/address';
import {extractSheetId} from '@shared/fe/util/google-sheets';

import {findDuplicated} from 'server/util/string';

import {EqbMerkleTreeRewardModel} from './model';

type UpdateMerkleRewardRequest = {
    trees: Array<{
        identifier: string
        root: string
        leafEncoding: string

        rewards: Array<{
            account: string
            amount: string | string[]
            proof: string[]
        }>
    }>
}

export function mountEqbMerkleTree(app: Application) {
    app.post('/su/api/eqb/merkle-reward', json({limit: '10MB'}), async (req, res) => {
        try {
            const {trees} = req.body as UpdateMerkleRewardRequest;
            console.log(`[EQB][MerkleReward] updating merkle reward, sheets: ${trees.length}`);

            const duplicates = trees
                .map(({identifier, rewards}) => ({
                    identifier,
                    duplicatedAccounts: findDuplicated(rewards.map(({account}) => account))
                }))
                .filter(({duplicatedAccounts}) => duplicatedAccounts.length > 0);
            if (duplicates.length > 0) {
                return res.status(400).json({message: 'Duplicated Accounts found!', duplicates});
            }

            for (const tree of trees) {
                const {identifier, root, leafEncoding, rewards} = tree;

                await EqbMerkleTreeRewardModel.deleteMany({identifier});

                for (const reward of rewards) {
                    const account = reward.account.toLowerCase();
                    const model = new EqbMerkleTreeRewardModel({identifier, root, leafEncoding, ...reward, account});
                    await model.save();
                }
            }

            res.status(200).json({success: true});
        } catch (err) {
            console.error('[EQB][MerkleReward] write error', err);
            res.status(500).json({message: (err as any).message});
        }
    });

    app.get('/su/api/eqb/merkle-reward/identifier', async (req, res) => {
        try {
            const {fix} = req.query;

            const identifiers = (await EqbMerkleTreeRewardModel.distinct('identifier').lean() as string[])
                .sort((a, b) => a.localeCompare(b));
            const mismatches = identifiers
                .map(identifier => {
                    const originalSheetId = identifier.split('::')[0];
                    const extractedSheetId = extractSheetId(originalSheetId);
                    const newIdentifier = [extractedSheetId, ...identifier.split('::').slice(1)].join('::');

                    return {
                        identifier,
                        newIdentifier,
                        newIdentifierExisting: identifiers.includes(newIdentifier),
                        originalSheetId,
                        extractedSheetId,
                    };
                })
                .filter(({identifier, newIdentifier}) => identifier !== newIdentifier);

            const fixed = !!fix && fix !== 'false' && mismatches.length > 0;
            if (fixed) {
                for (const {identifier, newIdentifier, newIdentifierExisting} of mismatches) {
                    if (newIdentifierExisting) {
                        console.log(`[EQB][MerkleReward] identifier already exists: ${newIdentifier}`);
                        continue;
                    }

                    console.log(`[EQB][MerkleReward] updating identifier: ${identifier} -> ${newIdentifier}`);
                    await EqbMerkleTreeRewardModel.updateMany({identifier}, {$set: {identifier: newIdentifier}});
                }

                return;
            }

            res.status(200).json({
                identifiers,
                mismatches,
                fixed
            });
        } catch (err) {
            console.error('[EQB][MerkleReward] read error', err);
            res.status(500).json({message: (err as any).message});
        }
    });

    app.get('/api/eqb/merkle-reward', async (req, res) => {
        try {
            const account = req.query.account as string;
            if (!account) {
                return res.status(400).json({message: 'account is required'});
            }

            if (typeof account !== 'string' || !isValidWalletAddress(account)) {
                return res.status(400).json({message: 'invalid account address'});
            }

            const rewards = await EqbMerkleTreeRewardModel.find({account: account.toLowerCase()}, '-_id -__v').lean();
            res.status(200).json({rewards});
        } catch (err) {
            console.error('[EQB][MerkleReward] read error', err);
            res.status(500).json({message: (err as any).message});
        }
    });

    app.get('/api/eqb/merkle-reward/root', async (req, res) => {
        try {
            const roots = await EqbMerkleTreeRewardModel.distinct('root').lean();

            res.status(200).json({roots});
        } catch (err) {
            console.error('[EQB][MerkleReward] read error', err);
            res.status(500).json({message: (err as any).message});
        }
    });
}
