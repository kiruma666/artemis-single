// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface IWNativeRelayer {
    function withdraw(address _wNative, uint256 _amount) external;
}
