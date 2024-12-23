/**
 * @Author: sheldon
 * @Date: 2023-11-05 20:05:44
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-27 00:43:13
 */

import {Application, json} from 'express';

import eqbChainInfoModel from './model';

export function mountEqbChainInfo(app: Application) {
    const apiPath = '/api/eqb-chain-info';
    const uploadApiPath = `${apiPath}/upload`;
    const jsonHandler = json({limit: '100MB'});
    app.post(apiPath, jsonHandler, async (req, res) => {
        try {
            const cache = req.body;
            const doc = await eqbChainInfoModel.create({cache});
            res.json({id: doc._id, createdAt: doc.createdAt});
            console.log(apiPath, 'post', doc._id);
        } catch (err) {
            res.status(500).json({message: (err as any).message});
            console.log(apiPath, 'post error', err);
        }
    }).post(uploadApiPath, jsonHandler, async (req, res) => {
        try {
            /* eslint @typescript-eslint/no-unused-vars: 1 */
            const {_id, ...restCacheRecord} = req.body;
            const doc = await eqbChainInfoModel.create(restCacheRecord);
            res.json({id: doc._id, createdAt: doc.createdAt});
            console.log(uploadApiPath, 'post', doc._id);
        } catch (err) {
            res.status(500).json({message: (err as any).message});
            console.log(uploadApiPath, 'upload error', err);
        }
    }).get(apiPath, async (req, res) => {
        try {
            const {limit = 30} = req.query;
            const docs = await eqbChainInfoModel.find().sort({createdAt: -1}).limit(+limit);
            res.json(docs);
            console.log(apiPath, 'get', docs.length);
        } catch (err) {
            console.log(apiPath, 'get error', err);
            res.status(500).json({message: (err as any).message});
        }
    });
}
