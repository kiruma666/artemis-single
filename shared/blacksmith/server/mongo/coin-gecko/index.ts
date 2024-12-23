import {Application} from 'express';

import {
    fetchCoinListWithMarketData,
    fetchCoinHistoricalChartData,
    fetchCoinData,

    DEFAULT_FROM_TIMESTAMP
} from './api';
import {
    loadCoinData,
    loadCoinHistoricalData,

    crawlCoinData,
    crawlCoinHistoricalData,
    crawlAllCoinHistoricalData,

    calcAllCoinHistoricalData
} from './script';

const API: Record<string, (req: any) => Promise<any>> = {
    fetchCoinListWithMarketData,
    fetchCoinHistoricalChartData,
    fetchCoinData,

    loadCoinData,
    loadCoinHistoricalData,

    crawlCoinData,
    crawlCoinHistoricalData,
    crawlAllCoinHistoricalData,

    calcAllCoinHistoricalData,
};

export function mountCoinGecko(app: Application) {
    let ongoingApiName: string | undefined = undefined;
    app.get('/api/debug/coin-gecko/:apiName', async (req, res) => {
        if (ongoingApiName) {
            return res.status(503).send(`${ongoingApiName} not finished yet`);
        }

        const {apiName} = req.params;
        if (!API[apiName]) {
            return res.status(404).send('API Not Found');
        }

        ongoingApiName = apiName;

        try {
            const body = await API[apiName](req.query);
            res.json(body);
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }

        ongoingApiName = undefined;
    });

    app.get('/api/coin-gecko/download-top-coins', async (req, res) => {
        const {start, end, limit = 10} = req.query;
        const fromTimestamp = start ? new Date(start.toString()).getTime() : DEFAULT_FROM_TIMESTAMP;
        const toTimestamp = end ? new Date(end.toString()).getTime() : Date.now();

        const results = await calcAllCoinHistoricalData({
            fromTimestamp,
            toTimestamp,
            limit: +limit
        });

        if (!results.length) {
            return res.status(404).send('No data found');
        }

        const headers = [
            'Coin ID',
            'Name',
            'Symbol',
            'Categories',

            'Start Date',
            'Start Price',
            'Start Market Cap',
            'Start Total Volume',

            'End Date',
            'End Price',
            'End Market Cap',
            'End Total Volume',

            'Price Change',
            'Price Change Percent',
            'Market Cap Change',
            'Market Cap Change Percent',
            'Total Volume Change',
            'Total Volume Change Percent'
        ].join(', ');

        const rows = results.map(({coin, head, tail, diff}) => [
            tail.coinId,
            coin.name ?? '',
            coin.symbol ?? '',
            coin.categories?.join(';;') ?? '',

            ...(head ? [
                new Date(head.timestamp).toISOString().slice(0, 10),
                head.priceUsd,
                head.marketCap,
                head.totalVolume
            ] : [
                '',
                '',
                '',
                ''
            ]),

            new Date(tail.timestamp).toISOString().slice(0, 10),
            tail.priceUsd,
            tail.marketCap,
            tail.totalVolume,

            diff?.priceUsdChange ?? '',
            diff?.priceChangePercent ?? '',
            diff?.marketCapChange ?? '',
            diff?.marketCapChangePercent ?? '',
            diff?.totalVolumeChange ?? '',
            diff?.totalVolumeChangePercent ?? ''
        ].join(', '));

        const body = [headers, ...rows].join('\n');

        const filename = `Top-${limit}__${new Date(fromTimestamp).toISOString().slice(0, 10)}__${new Date(toTimestamp).toISOString().slice(0, 10)}.csv`;
        res.setHeader('content-disposition', `attachment;filename="${filename}"`);
        res.send(body);
    });
}
