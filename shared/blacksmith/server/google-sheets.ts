import {getMetaFp, getValuesFp, appendValuesFp} from '@shared/fe/util/google-sheets';

export const baseUrl = (() => {
    const PORT = process.env.PORT;
    if (PORT) { // support fetch google sheets in prod Node server
        return `http://localhost:${PORT}`;
    }

    return 'https://niubiwanju.quoll.finance'; // local node server proxy to prod env
})();

export type {GetValuesOptions} from '@shared/fe/util/google-sheets';

export const getMeta = getMetaFp({baseUrl});

export const getValues = getValuesFp({baseUrl});

export const appendValues = appendValuesFp({baseUrl});

const HOLDER_SHEET_ID = '1WNvUdpqjM2CBaQeCo228Ksx9MINufAvxi_T7TpvOV4Y';

export const parseSheetData = (data?: string[][]) => {
    if (!data) return data;

    const [header, ...rows] = data;

    return rows.map(row => Object.fromEntries(header.map((field, idx) => [field, row[idx]])));
};

export async function getEuclidHolders() {
    try {
        const data = await getValues(HOLDER_SHEET_ID, {sheetName: 'holders'});
        const {values} = await data.json();

        return parseSheetData(values)?.map(holder => holder.address) || [];
    } catch (err) {
        console.log('getEuclidHolders failed', err);
    }

    return [];
}
