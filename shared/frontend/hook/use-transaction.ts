import {TransactionResponse, TransactionReceipt} from '@ethersproject/abstract-provider';
import {message} from 'antd';
import {useEffect, useState} from 'react';

export type TransMap = {
    response?: TransactionResponse,
    loading: boolean,
    receipt?: TransactionReceipt,
    error?: Error
};

export type Trans = Promise<TransactionResponse>;

export type OnChange = (map: TransMap) => void;

export default function useTransaction(trans: Trans, onChange?: OnChange) {
    const [transMap, setTransMap] = useState<TransMap>();

    useEffect(() => {
        const cancelableRes = trans.wrap();
        let cancelableRec: any;
        (async function() {
            let response, receipt;
            try {
                response = await cancelableRes;
                let map: TransMap = {response, loading: true};
                setTransMap(map);
                onChange?.(map);
                cancelableRec = response.wait().wrap();
                receipt = await cancelableRec;
                map = {response, receipt, loading: false};
                setTransMap(map);
                onChange?.(map);
            } catch (error) {
                // possibly receipt is not available
                setTransMap({response, loading: false, error: (error as any), receipt});

                if (error) message.error((error as any)?.data?.message || (error as any)?.message);
            }
        })();

        return () => {
            cancelableRes.cancel();
            cancelableRec?.cancel();
        };
    }, [trans]);

    return transMap;
}
