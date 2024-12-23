import {useState, useCallback} from 'react';

export default function usePartialState<T>(initialState: T) {
    const [state, setState] = useState<T>(initialState);
    const setPartial = useCallback((partial: Partial<T>) => setState(curState => ({...curState, ...partial})), []);

    return [state, setPartial, setState] as [typeof state, typeof setPartial, typeof setState];
}
