// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../Interfaces/IWNative.sol";
import "../Interfaces/IWNativeRelayer.sol";
import "./TransferHelper.sol";

contract WNativeRelayer is IWNativeRelayer {
    using SafeERC20 for IERC20;

    receive() external payable {}

    function withdraw(address _wNative, uint256 _amount) external override {
        IERC20(_wNative).safeTransferFrom(msg.sender, address(this), _amount);
        IWNative(_wNative).withdraw(_amount);
        TransferHelper.safeTransferETH(msg.sender, _amount);
    }
}
