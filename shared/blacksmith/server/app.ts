import express from 'express';

import {mountGoogleSheets} from '@shared/fe/server/middleware/google-sheets';
import mountHello from '@shared/fe/server/middleware/hello';
import mountSimpleCORS, {SimpleCorsOptions} from '@shared/fe/server/middleware/simple-cors';
import mountStatic from '@shared/fe/server/middleware/static';
import '@shared/fe/util/number-extension';

import {mountBiuTelegram} from './app/biubiujoy/middleware/telegram';
import {mountBiuTwitter} from './app/biubiujoy/middleware/twitter';
import {mountBiuAwsS3} from './app/biubiujoy/mongo/aws-s3';
import {mountBiuUser} from './app/biubiujoy/mongo/user';
import {mountBiuUserInviteCode} from './app/biubiujoy/mongo/user-invite-code';
import {mountBiuUserPoints} from './app/biubiujoy/mongo/user-points';
import startEqbTradingBot from './app/eqb/bot/trading-bot';
import {mountEqbVendorPoints} from './app/eqb/middleware/vendor-points';
import {mountEqbChainInfo} from './app/eqb/mongo/chain-info';
import {mountEqbMerkleTree} from './app/eqb/mongo/merkle-tree';
import {mountEqbVoteReward} from './app/eqb/mongo/vote-reward';
import mountMongo from './mongo';
import {mountArtemisHolderArtPoints} from './mongo/artemis/holder/art-points';
import {mountArtemisHolderGroupRanking} from './mongo/artemis/holder/asset-depositor/group-ranking';
import {mountArtemisHolderEPendleBalance} from './mongo/artemis/holder/e-pendle';
import {mountArtemisHolderNftPosition} from './mongo/artemis/holder/nft-position';
import {mountArtemisHolderCamelotNftPosition} from './mongo/artemis/holder/nft-position/camelot-nft';
import {mountArtemisHolderLpPosition} from './mongo/artemis/holder/nft-position/lp';
import {mountArtemisHolderSheobillArtMetisBalance} from './mongo/artemis/holder/sheobill/art-metis';
import {mountArtemisHolderSheobillMetisBalance} from './mongo/artemis/holder/sheobill/metis';
import {mountArtemisHolderVlEqbBalance} from './mongo/artemis/holder/vl-eqb';
import {mountCoinGecko} from './mongo/coin-gecko';
import {mountEigenLayerOperator} from './mongo/euclid/eigen-layer/operator';
import {mountEigenLayerPoints} from './mongo/euclid/eigen-layer/points';
import {mountEuclidHolderGroupRanking} from './mongo/euclid/holder/asset-depositor/group-ranking';
import {mountEuclidHolderEPendleBalance} from './mongo/euclid/holder/e-pendle';
import {mountEuclidHolderEPoints} from './mongo/euclid/holder/e-points';
import {mountEuclidHolderVlEqbBalance} from './mongo/euclid/holder/vl-eqb';
import {mountEuclidOperatorPoints} from './mongo/euclid/operator/points';

const CORS_OPTIONS: SimpleCorsOptions = {
    allowedOrigins: [
        // for testing
        'http://127.0.0.1:3006',
        'http://127.0.0.1:3007',
        'http://127.0.0.1:3008',
        'http://localhost:3006',
        'http://localhost:3007',
        'http://localhost:3008'
    ],

    allowedPaths: [
        '/api/biu',
        '/internal/api/biu/user', // TODO(pancake) remove after recaptcha is integrated
        '/api/eqb'
    ]
};

export default function startApp(isViteDev?: boolean) {
    startEqbTradingBot();

    const app = express();

    app.use((req, res, next) => {
        // ref: https://developers.google.com/search/docs/crawling-indexing/block-indexing
        res.setHeader('X-Robots-Tag', 'noindex');
        next();
    });

    mountHello(app);
    mountSimpleCORS(app, CORS_OPTIONS);

    mountMongo(app);

    mountGoogleSheets(app, {
        serviceName: 'BlackSmith',
    });

    mountCoinGecko(app);

    mountEqbChainInfo(app);
    mountEqbVoteReward(app);
    mountEqbMerkleTree(app);
    mountEqbVendorPoints(app);

    mountEigenLayerPoints(app);
    mountEigenLayerOperator(app);
    mountEuclidHolderVlEqbBalance(app);
    mountEuclidHolderEPendleBalance(app);
    mountEuclidHolderGroupRanking(app);
    mountEuclidHolderEPoints(app);
    mountEuclidOperatorPoints(app);

    mountArtemisHolderCamelotNftPosition(app);
    mountArtemisHolderLpPosition(app);
    mountArtemisHolderNftPosition(app);
    mountArtemisHolderVlEqbBalance(app);
    mountArtemisHolderEPendleBalance(app);
    mountArtemisHolderGroupRanking(app);
    mountArtemisHolderArtPoints(app);
    mountArtemisHolderSheobillArtMetisBalance(app);
    mountArtemisHolderSheobillMetisBalance(app);

    mountBiuAwsS3(app);
    mountBiuTelegram(app);
    mountBiuTwitter(app);
    mountBiuUser(app);
    mountBiuUserInviteCode(app);
    mountBiuUserPoints(app);

    if (!isViteDev) {
        mountStatic(app);
    }

    if (process.env.NODE_ENV === 'prod') {
        // TODO only run on stage prod
    }

    return app;
}
