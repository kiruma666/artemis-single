import {sheets_v4} from '@googleapis/sheets';
import fetch from 'isomorphic-fetch';

import {AppendValuesRequest} from '../types/google-sheet-middleware-types';

type Configuration = {
    baseUrl?: string
}

export type GetValuesParams = {
    sheetName: string
    range?: string
}

export type GetValuesOptions = {
    noGSheetCache?: boolean
}

type AppendValuesParams = {
    sheetName: string
    range: string
    values: any[][]
}

export const API_URL = '/api/data';

// super user api
export const SU_API_URL = '/su/api/data';

export const getMetaUrl = (spreadsheetId: string) => `${API_URL}/${spreadsheetId}`;

export const getMetaFp = (config?: Configuration) => async (spreadsheetId: string) => {
    const {baseUrl = ''} = config || {};
    const requestUrl = `${baseUrl}${getMetaUrl(spreadsheetId)}`;

    const response = await fetch(requestUrl);

    if (response.status !== 200) {
        throw new Error('Unknown Error');
    }

    return response;
};

export const getValuesUrl = (
    spreadsheetId: string,
    {sheetName, range}: GetValuesParams,
    {noGSheetCache}: GetValuesOptions = {}
) => `${API_URL}/${spreadsheetId}/values?range=${sheetName}${range ? `!${range}` : ''}${noGSheetCache ? '&noGSheetCache=true' : ''}`;

export const getValuesFp = (config?: Configuration) => async (
    spreadsheetId: string,
    params: GetValuesParams,
    options: GetValuesOptions = {}
) => {
    const {baseUrl = ''} = config || {};
    const requestUrl = `${baseUrl}${getValuesUrl(spreadsheetId, params, options)}`;

    const response = await fetch(requestUrl);

    if (response.status !== 200) {
        throw new Error('Unknown Error');
    }

    return response;
};

export const appendValuesFp = (config?: Configuration) => async (
    spreadsheetId: string,
    {sheetName, range, values}: AppendValuesParams
) => {
    const {baseUrl = ''} = config || {};
    const requestUrl = `${baseUrl}${API_URL}/${spreadsheetId}/values`;

    const request: AppendValuesRequest = {
        range: `${sheetName}!${range}`,
        values
    };

    const response = await fetch(requestUrl, {
        method: 'POST',
        body: JSON.stringify(request),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (response.status !== 200) {
        throw new Error('Unknown Error');
    }

    return response;
};

// only for internal tools usage!!!
export const batchUpdateFp = (config?: Configuration) => async (
    spreadsheetId: string,
    request: sheets_v4.Schema$BatchUpdateSpreadsheetRequest
) => {
    const {baseUrl = ''} = config || {};
    const requestUrl = `${baseUrl}${SU_API_URL}/${spreadsheetId}/batchUpdate`;

    const response = await fetch(requestUrl, {
        method: 'POST',
        body: JSON.stringify(request),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (response.status !== 200) {
        console.log(response); // eslint-disable-line no-console

        let message = 'Unknown Error';
        try {
            const data = await response.json();
            message = data.error.message;
        } catch (e) {
            message = 'Failed to retrieve error message';
        }

        throw new Error(message);
    }

    return response;
};

export const extractSheetId = (urlOrSheetId: string): string => {
    if (urlOrSheetId.startsWith('http')) {
        const regex = /\/spreadsheets\/d\/([^/#]+)(\/|$|#)/;
        const match = urlOrSheetId.match(regex);
        const result = match ? match[1] : urlOrSheetId;
        console.log(`[Google Sheets] extract sheetId, input=${urlOrSheetId}, output=${result}`); // eslint-disable-line no-console

        return result;
    }

    return urlOrSheetId;
};
