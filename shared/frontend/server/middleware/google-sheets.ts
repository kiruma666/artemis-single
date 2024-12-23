import {auth as gAuth, sheets as gSheets} from '@googleapis/sheets';
import {Application} from 'express';

import {AppendValuesRequest} from '../../types/google-sheet-middleware-types';
import {API_URL, SU_API_URL} from '../../util/google-sheets';
import {MAX_VIOLATION_COUNT_BEFORE_BLOCK, increaseViolationCount} from '../util/access-control';
import {sendMessage} from '../util/tele-bot';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// ${spreadsheetId}-${range} => values
const readValuesResponseCache: Record<string, any> = {};
const readValuesPromiseCache: Record<string, Promise<any>> = {};
const REFRESH_DURATION = 30 * 1e3; // 30 seconds

type Options = {
    serviceName?: string
    enableSuperApi?: boolean
}

/**
 * Service Account:
 * testnet: g-sheets@molten-acumen-388503.iam.gserviceaccount.com
 * prod: g-sheets-prod@molten-acumen-388503.iam.gserviceaccount.com
 * https://console.cloud.google.com/iam-admin/serviceaccounts/details/115225694748777133608
 * 
 * References:
 * https://github.com/googleapis/google-api-nodejs-client#google-apis-nodejs-client
 * https://hackernoon.com/how-to-use-google-sheets-api-with-nodejs-cz3v316f
 */
export function mountGoogleSheets(
    app: Application,
    {
        serviceName,
        enableSuperApi = false
    }: Options = {}
) {
    const msgTag = `[${serviceName}]`;
    const sendDevMessage = (msg: string, err?: any) => sendMessage(`${msgTag}${msg}${err?.message ? ` ${err.message}` : ''}`, {
        channel: 'dev',
        group: 'Google Sheets'
    });

    const auth = new gAuth.GoogleAuth({
        scopes: SCOPES
    });

    const {spreadsheets} = gSheets({version: 'v4', auth});

    app.get(`${API_URL}/:spreadsheetId`, (req, res) => {
        const {spreadsheetId} = req.params;
        console.log('[Google Sheets] reading sheet:', spreadsheetId);

        spreadsheets
            .get({
                spreadsheetId
            })
            .then(response => {
                console.log('[Google Sheets] reading sheet succeeded:', spreadsheetId);
                res.status(response.status).json(response.data);
            })
            .catch(error => {
                const msg = `[Google Sheets] reading sheet error: sheetId=${spreadsheetId}`;
                console.error(msg);
                console.error(error);
                sendDevMessage(msg, error);

                res.status(error.code || 500).json(error?.response?.data || {error: 'Unknown error.'});

                increaseViolationCount(req.ip);
            });
    });

    app.get(`${API_URL}/:spreadsheetId/values`, (req, res) => {
        const {spreadsheetId} = req.params;
        const {range, noGSheetCache} = req.query;
        const cacheFirst = !noGSheetCache;

        const cacheKey = `${spreadsheetId}-${range}`;
        let cachedPromise = undefined;
        if (cacheFirst) {
            cachedPromise = readValuesPromiseCache[cacheKey];
        }

        if (!cachedPromise) { // trigger a cache refresh
            console.log('[Google Sheets] refreshing values:', spreadsheetId, range);
            cachedPromise = spreadsheets.values
                .get({
                    spreadsheetId,
                    range: range as string
                })
                .then(response => {
                    console.log('[Google Sheets] refreshing values succeeded:', spreadsheetId, range);
                    readValuesResponseCache[cacheKey] = response;

                    setTimeout(() => {
                        delete readValuesPromiseCache[cacheKey];
                    }, REFRESH_DURATION);
                })
                .catch(error => {
                    const msg = `[Google Sheets] refreshing values error: sheetId=${spreadsheetId}, range=${range}`;
                    console.error(msg);
                    console.error(error);
                    sendDevMessage(msg, error);

                    delete readValuesPromiseCache[cacheKey];

                    increaseViolationCount(req.ip);
                });

            readValuesPromiseCache[cacheKey] = cachedPromise;
        }

        let cachedResponse = readValuesResponseCache[cacheKey];
        if (cacheFirst && cachedResponse) { // cache first, then trigger a refresh
            console.log('[Google Sheets] reading values from cache:', spreadsheetId, range);
            res.status(cachedResponse.status).json(cachedResponse.data);

            return;
        }

        cachedPromise
            .then(() => {
                cachedResponse = readValuesResponseCache[cacheKey];
                if (cachedResponse) {
                    console.log('[Google Sheets] reading values from new cache:', spreadsheetId, range);
                    res.status(cachedResponse.status).json(cachedResponse.data);
                } else {
                    const msg = `[Google Sheets] reading values from new cache error: not found, sheetId=${spreadsheetId}, range=${range}`;
                    console.error(msg);
                    sendDevMessage(msg);

                    res.status(500).json({error: 'Unknown error.'});
                }
            })
            .catch(error => {
                const msg = `[Google Sheets] reading values from new cache error: sheetId=${spreadsheetId}, range=${range}`;
                console.error(msg);
                console.error(error);
                sendDevMessage(msg, error);

                res.status(500).json({error: 'Unknown error.'});

                increaseViolationCount(req.ip);
            });
    });

    app.post(`${API_URL}/:spreadsheetId/values`, (req, res) => {
        const {spreadsheetId} = req.params;
        console.log('[Google Sheets] appending values:', spreadsheetId);

        const {range, values} = (req.body || {}) as AppendValuesRequest;

        spreadsheets.values
            .append({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values
                }
            })
            .then(response => {
                console.log('[Google Sheets] appending values succeeded:', spreadsheetId);
                res.status(response.status).json(response.data);
            })
            .catch(error => {
                const msg = `[Google Sheets] appending values error: sheetId=${spreadsheetId}, range=${range}`;
                console.error(msg, req);
                console.error(error);
                sendDevMessage(msg, error);

                res.status(error.code || 500).json(error?.response?.data || {error: 'Unknown error.'});

                increaseViolationCount(req.ip, MAX_VIOLATION_COUNT_BEFORE_BLOCK); // directly block the IP
            });
    });

    if (!enableSuperApi) {
        return;
    }

    // IMPORTANT NOTE:
    // batch update, very dangerous action, should limit usage only in test/next env,
    // if this endpoint is exposed, hackers can easily wipe out all data or add any malicious data
    app.post(`${SU_API_URL}/:spreadsheetId/batchUpdate`, (req, res) => {
        const {spreadsheetId} = req.params;
        console.log('[Google Sheets] batchUpdate:', spreadsheetId);

        spreadsheets
            .batchUpdate({
                spreadsheetId: req.params.spreadsheetId,
                requestBody: req.body
            })
            .then(response => {
                console.log('[Google Sheets] batchUpdate succeeded:', spreadsheetId);
                res.status(response.status).json(response.data);
            })
            .catch(error => {
                const msg = `[Google Sheets] batchUpdate error: sheetId=${spreadsheetId}`;
                console.error(msg, req);
                console.error(error);
                sendDevMessage(msg, error);

                res.status(error.code || 500).json(error?.response?.data || {error: 'Unknown error.'});

                increaseViolationCount(req.ip);
            });
    });
}
