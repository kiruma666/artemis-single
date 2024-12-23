import {Schema, model} from 'mongoose';

const required = true;

const CoinDataSchema = new Schema({
    coinId: {
        type: String,
        required
    },
    symbol: {
        type: String,
        required
    },
    name: {
        type: String,
        required
    },
    categories: {
        type: [String],
        required
    },
    lastUpdated: {
        type: Date,
        required
    },
});

const CoinHistoricalDataSchema = new Schema({
    timestamp: {
        type: Date,
        required
    },
    coinId: {
        type: String,
        required
    },
    priceUsd: {
        type: Number,
        required
    },
    marketCap: {
        type: Number,
        required
    },
    totalVolume: {
        type: Number,
        required
    },
});

export const CoinDataModel = model('coin_gecko_coin_data', CoinDataSchema);
export const CoinHistoricalDataModel = model('coin_gecko_coin_historical_data', CoinHistoricalDataSchema);
