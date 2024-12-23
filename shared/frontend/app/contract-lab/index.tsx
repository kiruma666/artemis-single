/* eslint-disable no-console */
import {ArrowLeftOutlined} from '@ant-design/icons';
import {ParamType, JsonFragment} from '@ethersproject/abi';
import {Button, Card, Collapse, Input} from 'antd';
import {BigNumber, Contract, PayableOverrides, ethers} from 'ethers';
import {useEffect} from 'react';
import {Flex} from 'theme-ui';

import Cond from '@shared/fe/component/cond';
import useLocalStorage from '@shared/fe/hook/use-local-storage';
import usePartialState from '@shared/fe/hook/use-partial-state';

type ContractInput = {
    desc?: string,
    address: string,
    abi: any
};

type Cached = ContractInput;

type State = ContractInput & {
    contract?: Contract
    overrides: PayableOverrides
};

const getAbiItemPriority = (abiItem: JsonFragment) => {
    const {type, stateMutability} = abiItem;
    if (type === 'function') {
        if (stateMutability === 'nonpayable') {
            return 0;
        }

        return 1;
    }

    return 2;
};

// ref: https://docs.soliditylang.org/en/v0.8.16/abi-spec.html#types
function parseParam (value: string, paramType: ParamType) {
    const {type, components} = paramType;
    const trimedVal = value?.trim?.() ?? value;
    // array of some type
    const arrayReg = /\[\]$/;
    if (arrayReg.test(type)) {
        const itemType = type.replace(arrayReg, '');

        return JSON.parse(trimedVal).map((itemVal: any) => parseParam(typeof itemVal !== 'string' ? JSON.stringify(itemVal) : itemVal, ParamType.from({...paramType, type: itemType})));
    }

    if (/int|fixed/.test(type)) {
        return BigNumber.from(trimedVal);
    }

    if (type === 'bool') {
        return Boolean(JSON.parse(trimedVal));
    }

    if (type === 'tuple') {
        return JSON.parse(trimedVal).map((tupleVal: string, idx: number) => parseParam(tupleVal, components[idx]));
    }

    return trimedVal;
}

type ContractLabProps = {
    library: ethers.providers.Web3Provider
}

const ContractLab: React.FC<ContractLabProps> = ({library}) => {
    const [cachedList, setCached] = useLocalStorage<Cached[] | undefined>('ContractLab');
    const [state, setPartial] = usePartialState<State>({
        desc: '',
        address: '',
        abi: null,
        contract: undefined,
        overrides: {}
    });
    const [inputMap, setInput] = usePartialState<Record<string, any[]>>({});
    const isBtnDisabled = !state.address || !state.abi || !library;
    const initContract = (evt?: any) => {
        if (isBtnDisabled) return;

        setPartial({
            contract: new Contract(state.address, state.abi, library.getSigner())
        });

        if (evt) {
            updateCache();
        }
    };

    const updateCache = (newCached = {desc: state.desc, address: state.address, abi: state.abi}) => {
        const {address} = newCached;
        // update cached
        if (cachedList?.length) {
            const idx = cachedList.findIndex(cached => cached.address === address);
            if (idx === -1) {
                cachedList.unshift(newCached);
            }

            // if idx is 0, no need to reorder
            if (idx) {
                const [used] = cachedList.splice(idx, 1);
                cachedList.unshift(used);
            }

            setCached(cachedList.slice(0, 50));
        } else {
            setCached([newCached]);
        }
    };

    const deleteContract = (addressToDelete: string) => {
        // filter out the contract to delete
        const updatedCachedList = cachedList?.filter(cached => cached.address !== addressToDelete);
        // update local storage
        setCached(updatedCachedList);
    };

    useEffect(() => {
        if (!state.contract) {
            initContract();
        }
    }, [cachedList]);

    return (
        <Cond
            cond={!state.contract}
        >
            <div
                sx={{textAlign: 'center'}}
            >
                <Cond
                    cond={cachedList?.length}
                    sx={{
                        mt: 5,
                        textAlign: 'left'
                    }}
                >
                    Hold the `Ctrl` or `Command` key and click Buttons below will not jump to the next step.
                    So you can only change the address with the same abi.
                </Cond>
                {cachedList?.map(({address, abi, desc = 'unknown'}, index) => (
                    <Flex
                        key={index}
                        sx={{alignItems: 'center'}}
                    >
                        <Button
                            key={address}
                            block
                            sx={{my: 3}}
                            onClick={evt => {
                                setPartial({address, abi, desc});
                                if (!evt.metaKey && !evt.ctrlKey) {
                                    updateCache({address, abi, desc});
                                }
                            }}
                        >
                            {desc}/{address}
                        </Button>
                        <Button
                            danger
                            onClick={
                                evt => {
                                    evt.stopPropagation();
                                    deleteContract(address);
                                }
                            }
                        >
                            Delete
                        </Button>
                    </Flex>
                ))}
                <Input
                    value={state.desc}
                    sx={{my: 3}}
                    placeholder="contract name/remarks/description"
                    onChange={e => setPartial({desc: e.target.value})}
                />
                <Input
                    value={state.address}
                    sx={{my: 3}}
                    placeholder="contract address"
                    onChange={e => setPartial({address: e.target.value})}
                />
                <Input.TextArea
                    value={state.abi ? JSON.stringify(state.abi) : ''}
                    sx={{my: 3}}
                    placeholder="contract json abi"
                    onChange={e => {
                        try {
                            setPartial({abi: JSON.parse(e.target.value)});
                        } catch (err) {
                            // ignore
                        }
                    }}
                />
                <Button
                    type="primary"
                    size="large"
                    sx={{
                        mb: 3,
                        width: ['50%', '25%']
                    }}
                    disabled={isBtnDisabled}
                    onClick={initContract}
                >
                    Confirm
                </Button>
            </div>

            <>
                <Button
                    size="large"
                    sx={{
                        mt: 3,
                        width: ['50%', '25%']
                    }}
                    onClick={() => setPartial({contract: undefined})}
                >
                    <ArrowLeftOutlined />
                    Back
                </Button>
                <Card
                    sx={{my: 3}}
                    title="Overrides"
                >
                    <Input
                        sx={{mb: 3}}
                        placeholder="gasLimit"
                        value={state.overrides.gasLimit as string}
                        onChange={e => setPartial({overrides: {...state.overrides, gasLimit: e.target.value}})}
                    />
                    <Input
                        placeholder="value"
                        value={state.overrides.value as string}
                        onChange={e => setPartial({overrides: {...state.overrides, value: e.target.value}})}
                    />
                </Card>
                <Collapse
                    sx={{
                        my: 3
                    }}
                >
                    {state?.abi?.sort(
                        (a: any, b: any) => getAbiItemPriority(a) - getAbiItemPriority(b)
                    ).map((jsonFragment: JsonFragment) => {
                        const {type, name, inputs} = jsonFragment;
                        // 使用 inputs进行every，inputMap[name] 是empty的element every不到
                        const isInputsReady = !name || !inputs?.length || inputs.every((paramType, idx) => inputMap[name]?.[idx] !== undefined);

                        return name && (
                            <Collapse.Panel
                                key={name}
                                header={name}
                            >
                                {inputs?.map((paramType: any, idx: number) => {
                                    const {name: inputName, type: inputType} = paramType;

                                    return (
                                        <Input
                                            key={inputName}
                                            sx={{mb: 3}}
                                            placeholder={`${inputName} ${inputType}`}
                                            onChange={({target: {value}}) => {
                                                const args = inputMap[name] || [];
                                                try {
                                                    args[idx] = parseParam(value, paramType);
                                                } catch (err) {
                                                    console.log(err);
                                                    args[idx] = undefined;
                                                }

                                                setInput({
                                                    [name]: args
                                                });
                                            }}
                                        />
                                    );
                                })}

                                <Cond
                                    cond={type === 'function'}
                                >
                                    <Button
                                        type="primary"
                                        size="large"
                                        sx={{
                                            width: ['50%', '25%']
                                        }}
                                        disabled={!isInputsReady}
                                        onClick={async () => {
                                            const overrides = {
                                                gasLimit: (state.overrides.gasLimit as string)?.trim() || undefined,
                                                value: (state.overrides.value as string)?.trim() || undefined
                                            };
                                            const args = [...(inputMap[name] || []), overrides];
                                            console.log('params:', inputMap[name], 'overrides:', overrides, 'args:', args);
                                            const rst = await state.contract?.[name].apply(null, args);
                                            console.log(rst);
                                            (window as any).__rst = rst; // eslint-disable-line
                                        }}
                                    >
                                        Submit
                                    </Button>
                                </Cond>
                            </Collapse.Panel>
                        );
                    })}
                </Collapse>
            </>
        </Cond>
    );
};

export default ContractLab;
