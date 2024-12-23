export default function usePartialState<T extends object>(initialState: T) {
    const map = initialState;
    const setPartial = (partial: Partial<T>) => Object.assign(map, partial);

    return [map, setPartial];
}
