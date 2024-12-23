/*
 * @Author: xiaodongyu
 * @Date: 2022-10-08 11:34:10
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-10-30 10:55:41
 */

import {Application} from 'express';

import {ArtemisAssetDepositorScript} from './artemis/holder/asset-depositor';
import {ArtemisWithdrawInitiatedScript} from './artemis/holder/asset-depositor/withdraw-initiated';
import {ArtemisLiquiditySwapScript} from './artemis/holder/liquidity-swap';
import {ArtemisArtMetisTransferScript} from './artemis/holder/liquidity-swap/art-metis-transfer';
import connectMongo from './connect';
import {PENDLEPaloozaGalxeScript} from './eqb/galxe/pendle-palooza';
import {swETHEqbGalxeScript} from './eqb/galxe/sweth';
import {EigenLayerAssetDepositorScript} from './euclid/eigen-layer/asset-deposit';
import {EigenLayerLRTUnstakingVaultScript} from './euclid/eigen-layer/asset-unstake';
import {EuclidAssetDepositorScript} from './euclid/holder/asset-depositor';
import {EuclidAssetWithdrawalScript} from './euclid/holder/asset-depositor/withdrawal';
import {EuclidOperatorDepositScript} from './euclid/operator/deposit';
import Script from './script';
import {skilletCakeCampaignGalxeScript} from './skillet/galxe/cake-campagin';

const ScriptMap: Record<string, Script> = {
    ArtemisAssetDepositorScript,
    ArtemisWithdrawInitiatedScript,
    ArtemisLiquiditySwapScript,
    ArtemisArtMetisTransferScript,

    EigenLayerAssetDepositorScript,
    EigenLayerLRTUnstakingVaultScript,
    EuclidAssetDepositorScript,
    EuclidAssetWithdrawalScript,
    EuclidOperatorDepositScript,

    PENDLEPaloozaGalxeScript,
    swETHEqbGalxeScript,

    skilletCakeCampaignGalxeScript,
};

export default function mountMongo(app: Application) {
    app.use(connectMongo());

    app.use('/script/:script/:method', async (req, res) => {
        const {script, method} = req.params;
        const scriptObj = (ScriptMap as any)[script];
        try {
            if (scriptObj?.[method]) {
                const body = await (ScriptMap as any)[script][method](req.query);
                if (!body) {
                    return res.send('Script done!');
                }

                const isTxt = typeof body === 'string';
                const filename = (scriptObj?.meta?.name ?? 'data') + '-' + (req.query?.blockEnd ?? 'latest') + '.' + (isTxt ? 'csv' : 'zip');
                res.setHeader('content-disposition', `attachment;filename="${filename}"`);

                if (isTxt) {
                    res.send(body);
                } else {
                    body.pipe(res);
                }
            } else {
                const error = new Error(`Does not exist: ${script}-${method}`);
                console.log(error);
                res.end(error.message);
            }
        } catch (err) {
            console.log(err);
            res.end('Erorr: ' + (err as any)?.message ?? '');
        }
    });
}
