import {useMemo} from 'react';

import XScrollBox from '@shared/fe/component/box/x-scroll-box';

import {getLocalStorageEstimatedSizes} from '../../util/local-cache';

const Size: React.FC<{value: number}> = ({value}) => <>{(value / 1024).toFixed(2)} KB</>;

const LocalStorageManagement = () => {
    const sizes = useMemo(() => getLocalStorageEstimatedSizes().sort((a, b) => b.size - a.size), []);
    const total = useMemo(() => sizes.reduce((acc, {size}) => acc + size, 0), [sizes]);

    return (
        <XScrollBox>
            <table>
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Size</th>
                    </tr>
                    <tr>
                        <th>Total</th>
                        <th><Size value={total} /></th>
                    </tr>
                </thead>
                <tbody>
                    {sizes.map(({key, size}) => (
                        <tr key={key}>
                            <td>{key}</td>
                            <td><Size value={size} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </XScrollBox>
    );
};

export default LocalStorageManagement;
