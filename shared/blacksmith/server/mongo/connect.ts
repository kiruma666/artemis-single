/*
 * @Author: xiaodongyu
 * @Date: 2022-10-08 11:35:53
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-25 17:23:21
 */

import {RequestHandler} from 'express';
import mongoose from 'mongoose';

type MongoOptions = {
    host: string
    dbName: string
    user?: string
    pass?: string
    ssl?: boolean
    sslCA?: string
};

function getMongoOptions(): MongoOptions {
    const {
        NODE_ENV = 'dev'
    } = process.env;

    const [
        host = '127.0.0.1:27017',
        dbName = 'blacksmith_dev',
        user,
        pass,
        ssl,
        sslCA
    ] = [
        'host',
        'db',
        'user',
        'pass',
        'ssl',
        'ssl_ca'
    ].map(key => process.env[`mongo_${NODE_ENV}_${key}`]);

    return {
        user,
        pass,
        host,
        dbName,
        ssl: ssl !== undefined ? true : undefined,
        sslCA
    };
}

export default function connectMongo(getOptions = getMongoOptions): RequestHandler {
    const {
        host,
        dbName,
        user,
        pass,
        ssl,
        sslCA
    } = getOptions();

    const uri = `mongodb://${host}/${dbName}`;
    const connectPromise = mongoose.connect(uri, {
        user,
        pass,
        ssl,
        sslCA,
        retryWrites: false
    });

    connectPromise.then(() => {
        console.log('mongodb connected at:', uri);
    });

    return async (req, res, next) => {
        await connectPromise;
        next();
    };
}
