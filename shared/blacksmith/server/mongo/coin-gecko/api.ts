import fetch from 'isomorphic-fetch';

const BASE_URL = 'https://pro-api.coingecko.com/api/v3';
const BASE_OPTIONS = {
    method: 'GET',
    headers: {
        'x-cg-pro-api-key': process.env.COIN_GECKO_API_KEY ?? '',
    },
};

// Ref: https://docs.coingecko.com/reference/coins-markets
enum CoinListOrder {
    MARKET_CAP_DESC = 'market_cap_desc',
    MARKET_CAP_ASC = 'market_cap_asc',
    VOLUME_ASC = 'volume_asc',
    VOLUME_DESC = 'volume_desc',
    ID_ASC = 'id_asc',
    ID_DESC = 'id_desc'
}

type CoinWithMarketData = {
    id: string
    symbol: string
    name: string
    image: string
    current_price: number
    market_cap: number
    market_cap_rank: number
    fully_diluted_valuation: number
    total_volume: number
    high_24h: number
    low_24h: number
    price_change_24h: number
    price_change_percentage_24h: number
    market_cap_change_24h: number
    market_cap_change_percentage_24h: number
    circulating_supply: number
    total_supply: number
    max_supply: number
    ath: number
    ath_change_percentage: number
    ath_date: string
    atl: number
    atl_change_percentage: number
    atl_date: string
    last_updated: string
    price_change_percentage_1h_in_currency: number
    price_change_percentage_24h_in_currency: number
    price_change_percentage_7d_in_currency: number
    price_change_percentage_14d_in_currency: number
    price_change_percentage_30d_in_currency: number
    price_change_percentage_200d_in_currency: number
    price_change_percentage_1y_in_currency: number
}

export const fetchCoinListWithMarketData = async ({
    order = CoinListOrder.MARKET_CAP_DESC,
    pageNo = 1,
    pageSize = 10,
}: {
    order?: CoinListOrder
    pageNo?: number
    pageSize?: number // max 250
}) => {
    const url = `${BASE_URL}/coins/markets?vs_currency=usd&order=${order}&per_page=${pageSize}&page=${pageNo}&price_change_percentage=1h,24h,7d,14d,30d,200d,1y&precision=full`;
    console.log('[CoinGecko] fetchCoinListWithMarketData', url);

    const response = await fetch(url, BASE_OPTIONS);

    return response.json() as Promise<CoinWithMarketData[]>;
};

// Ref: https://docs.coingecko.com/reference/coins-id-market-chart-range
enum DataInterval {
    FIVE_MINUTES = '5m',
    HOURLY = 'hourly',
    DAILY = 'daily'
}

type CoinHistoricalChartData = {
    prices: [number, number][]
    market_caps: [number, number][]
    total_volumes: [number, number][]
}

export const DEFAULT_FROM_TIMESTAMP = new Date('2023-10-01').getTime();

export const fetchCoinHistoricalChartData = async ({
    coinId,
    fromTimestamp = DEFAULT_FROM_TIMESTAMP,
    toTimestamp = Date.now(),
    interval = DataInterval.DAILY,
}: {
    coinId: string // coin id
    fromTimestamp?: number
    toTimestamp?: number
    interval?: DataInterval
}) => {
    const from = Math.floor(fromTimestamp / 1e3);
    const to = Math.floor(toTimestamp / 1e3);
    const url = `${BASE_URL}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}&interval=${interval}&precision=full`;
    console.log('[CoinGecko] fetchCoinHistoricalChartData', url);

    const response = await fetch(url, BASE_OPTIONS);

    return response.json() as Promise<CoinHistoricalChartData>;
};

// Ref: https://docs.coingecko.com/reference/coins-id
type CoinData = {
    id: string
    symbol: string
    name: string
    categories: string[]
    last_updated: string
}

export const fetchCoinData = async ({
    coinId
}: {
    coinId: string
}) => {
    const url = `https://pro-api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
    console.log('[CoinGecko] fetchCoinData', url);

    const response = await fetch(url, BASE_OPTIONS);

    return response.json() as Promise<CoinData>;
};
