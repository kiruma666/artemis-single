import {
    fetchCoinListWithMarketData,
    fetchCoinHistoricalChartData,
    DEFAULT_FROM_TIMESTAMP,
    fetchCoinData
} from './api';
import {
    CoinDataModel,
    CoinHistoricalDataModel
} from './model';

interface ForceUpdatable {
    forceUpdate?: boolean
}

type CoinHistoricalDataParam = {
    coinId: string
    fromTimestamp?: number | string | Date
    toTimestamp?: number | string | Date
}

type AllCoinHistoricalDataParams = {
    fromTimestamp?: number | string | Date
    toTimestamp?: number | string | Date
    limit?: number
}

const getUTCDayStartTimestamp = (timestamp: number | string | Date) => {
    let date = undefined;
    if (typeof timestamp === 'string' && timestamp === `${+timestamp}`) { // handle number string
        date = new Date(+timestamp);
    } else {
        date = new Date(timestamp);
    }

    return date.setUTCHours(0, 0, 0, 0);
};

export const loadCoinData = async ({coinId}: {coinId: string}) => CoinDataModel.findOne({coinId}).lean();

export const crawlCoinData = async ({
    coinId,
    forceUpdate
}: {
    coinId: string
} & ForceUpdatable) => {
    console.log('[CoinGecko] crawlCoinData', coinId);

    const dbData = await loadCoinData({coinId});
    if (dbData && !forceUpdate) {
        console.log(`[CoinGecko] crawlCoinData: ${coinId} data is already in DB`);

        return {
            success: true,
            data: dbData
        };
    }

    const fetchedData = await fetchCoinData({coinId});
    if (!fetchedData) {
        throw new Error(`Failed to fetch data for coin ${coinId}`);
    }

    const data = {
        coinId: fetchedData.id,
        symbol: fetchedData.symbol,
        name: fetchedData.name,
        categories: fetchedData.categories,
        lastUpdated: new Date(fetchedData.last_updated)
    };

    await CoinDataModel.findOneAndUpdate({coinId}, data, {
        upsert: true
    });

    return {
        success: true,
        data: await loadCoinData({coinId})
    };
};

export const loadCoinHistoricalData = async ({
    coinId,
    fromTimestamp = DEFAULT_FROM_TIMESTAMP,
    toTimestamp = Date.now()
}: CoinHistoricalDataParam) => {
    return CoinHistoricalDataModel
        .find({
            coinId,
            timestamp: {
                $gte: fromTimestamp,
                $lte: toTimestamp
            }
        })
        .sort({timestamp: 1})
        .lean();
};

export const crawlCoinHistoricalData = async (param: CoinHistoricalDataParam & ForceUpdatable) => {
    console.log('[CoinGecko] crawlCoinHistoricalData', param);

    const {
        coinId,
        fromTimestamp = DEFAULT_FROM_TIMESTAMP,
        toTimestamp = Date.now(),
        forceUpdate
    } = param;

    const fromDate = getUTCDayStartTimestamp(fromTimestamp);
    const toDate = getUTCDayStartTimestamp(toTimestamp);

    if (fromDate > toDate) {
        throw new Error('Invalid date range');
    }

    // 1. check if data is already in DB
    const dbDataList = await loadCoinHistoricalData({
        coinId,
        fromTimestamp: fromDate,
        toTimestamp: toDate
    });

    dbDataList.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (dbDataList.length > 0 && dbDataList[0].timestamp.getTime() === fromDate && dbDataList[dbDataList.length - 1].timestamp.getTime() === toDate && !forceUpdate) {
        console.log(`[CoinGecko] crawlCoinHistoricalData: ${coinId} data is already up-to-date`);

        return dbDataList;
    }

    // 2. fetch data from CoinGecko
    console.log(`[CoinGecko] crawlCoinHistoricalData: ${coinId} fetching data from ${new Date(fromDate)} to ${new Date(toDate)}`);

    const fetchedData = await fetchCoinHistoricalChartData({
        coinId: coinId,
        fromTimestamp: fromDate,
        toTimestamp: toDate
    });

    console.log(`[CoinGecko] crawlCoinHistoricalData: ${coinId} fetched ${fetchedData.prices.length} prices`);

    // 3. save data to DB
    for (let i = 0; i < fetchedData.prices.length; ++i) {
        if (!fetchedData.prices[i][0] || fetchedData.prices[i][0] !== fetchedData.market_caps[i][0] || fetchedData.prices[i][0] !== fetchedData.total_volumes[i][0]) {
            console.error('[CoinGecko] crawlCoinHistoricalData: fetchedData', fetchedData);
            throw new Error(`Invalid data for coin ${coinId} at index ${i}`);
        }

        const timestamp = fetchedData.prices[i][0];
        if (dbDataList.some(data => data.timestamp.getTime() === timestamp)) {
            if (forceUpdate) {
                console.log(`[CoinGecko] crawlCoinHistoricalData: ${coinId} data at ${new Date(timestamp)} is already in DB, force updating`);
            } else {
                console.log(`[CoinGecko] crawlCoinHistoricalData: ${coinId} data at ${new Date(timestamp)} is already in DB`);
                continue;
            }
        }

        console.log(`[CoinGecko] crawlCoinHistoricalData: ${coinId} saving data at ${new Date(timestamp)}`);

        const priceUsd = fetchedData.prices[i][1];
        const marketCap = fetchedData.market_caps[i][1];
        const totalVolume = fetchedData.total_volumes[i][1];

        const data = {
            timestamp,
            coinId,
            priceUsd,
            marketCap,
            totalVolume
        };

        await CoinHistoricalDataModel.findOneAndUpdate({
            timestamp,
            coinId
        }, data, {
            upsert: true
        });
    }

    console.log(`[CoinGecko] crawlCoinHistoricalData: ${coinId} data saved`);

    return loadCoinHistoricalData({
        coinId,
        fromTimestamp: fromDate,
        toTimestamp: toDate
    });
};

const MAX_PAGE_SIZE = 250;
export const crawlAllCoinHistoricalData = async (param: AllCoinHistoricalDataParams & ForceUpdatable) => {
    console.log('[CoinGecko] crawlAllCoinHistoricalData', param);

    const {
        fromTimestamp,
        toTimestamp,
        limit = MAX_PAGE_SIZE,
        forceUpdate
    } = param;

    // 1. fetchCoinListWithMarketData
    const coinList = [];
    const pageSize = Math.min(limit, MAX_PAGE_SIZE);
    let pageNo = 1;
    while (coinList.length < limit) {
        const list = await fetchCoinListWithMarketData({
            pageNo,
            pageSize
        });

        if (list.length === 0) {
            break;
        }

        coinList.push(...list);
        ++pageNo;
    }

    const list = coinList.slice(0, limit);

    // 2. check if each coin data & historical data is already in DB, otherwise crawl & save it
    for (const coin of list) {
        const {id} = coin;

        await crawlCoinData({
            coinId: id,
            forceUpdate
        });

        await crawlCoinHistoricalData({
            coinId: id,
            fromTimestamp,
            toTimestamp,
            forceUpdate
        });
    }

    return {
        success: true,
        count: list.length,
        list
    };
};

export const calcAllCoinHistoricalData = async (param: AllCoinHistoricalDataParams) => {
    console.log('[CoinGecko] calcAllCoinHistoricalData', param);

    const {
        fromTimestamp = DEFAULT_FROM_TIMESTAMP,
        toTimestamp = Date.now(),
        limit = 10
    } = param;

    const fromDate = getUTCDayStartTimestamp(fromTimestamp);
    const toDate = getUTCDayStartTimestamp(toTimestamp);

    const coinList = await CoinDataModel.find().lean();
    const headList = await CoinHistoricalDataModel.find({timestamp: fromDate}).lean();
    const tailList = await CoinHistoricalDataModel.find({timestamp: toDate}).sort({marketCap: -1}).limit(limit).lean();

    // generate coins map
    const coinsMap = coinList.reduce((map, coin) => {
        map[coin.coinId] = coin;

        return map;
    }, {} as Record<string, any>);

    // generate heads map
    const missingHeads = tailList.filter(tail => !headList.some(head => head.coinId === tail.coinId));
    const additionalHeadList = [];
    for (const missingHead of missingHeads) {
        const {coinId} = missingHead;
        const head = await CoinHistoricalDataModel.findOne({coinId, timestamp: {$gte: fromDate}}).sort({timestamp: 1}).lean(); // oldest data
        if (head) {
            additionalHeadList.push(head);
        }
    }

    const headsMap = [...headList, ...additionalHeadList].reduce((map, head) => {
        map[head.coinId] = head;

        return map;
    }, {} as Record<string, any>);

    return tailList.map(tail => {
        const head = headsMap[tail.coinId];
        if (!head) {
            return {
                tail
            };
        }

        const diff = {
            priceUsdChange: tail.priceUsd - head.priceUsd,
            priceChangePercent: (tail.priceUsd - head.priceUsd) / head.priceUsd * 100,
            marketCapChange: tail.marketCap - head.marketCap,
            marketCapChangePercent: (tail.marketCap - head.marketCap) / head.marketCap * 100,
            totalVolumeChange: tail.totalVolume - head.totalVolume,
            totalVolumeChangePercent: (tail.totalVolume - head.totalVolume) / head.totalVolume * 100
        };

        return {
            coin: coinsMap[tail.coinId],
            head,
            tail,
            diff
        };
    });
};
