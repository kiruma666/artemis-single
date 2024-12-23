// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "../Interfaces/IMerkleDistributorV2.sol";
import "./TransferHelper.sol";

contract MerkleDistributorV2 is IMerkleDistributorV2, AccessControlUpgradeable {
    using TransferHelper for address;
    using SafeERC20 for IERC20;

    bytes32 public merkleRoot;
    address[] public tokens;

    mapping(address => mapping(address => uint256)) public claimedAmounts;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    event MerkleRootUpdatedAndFunded(
        bytes32 _merkleRoot,
        address[] _tokens,
        uint256[] _amounts
    );

    event Claimed(address _user, address _token, uint256 _amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) public override initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(ADMIN_ROLE, _owner);
    }

    function setMerkleRootAndFund(
        bytes32 _merkleRoot,
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) external payable onlyRole(ADMIN_ROLE) {
        require(_tokens.length == _amounts.length, "invalid input");
        require(_tokens.length > 0, "invalid _tokens");

        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            uint256 amount = _amounts[i];
            if (amount == 0) {
                continue;
            }
            if (AddressLib.isPlatformToken(token)) {
                require(amount == msg.value, "invalid amount");
            } else {
                IERC20(token).safeTransferFrom(
                    msg.sender,
                    address(this),
                    amount
                );
            }
        }

        merkleRoot = _merkleRoot;
        tokens = _tokens;

        emit MerkleRootUpdatedAndFunded(_merkleRoot, _tokens, _amounts);
    }

    function claim(
        uint256[] calldata _amounts,
        bytes32[] calldata _proof
    ) external {
        require(
            _verifyMerkleData(msg.sender, _amounts, _proof),
            "invalid proof"
        );

        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amountOut = _amounts[i] - claimedAmounts[msg.sender][token];
            if (amountOut == 0) {
                continue;
            }
            claimedAmounts[msg.sender][token] = _amounts[i];
            token.safeTransferToken(msg.sender, amountOut);
            emit Claimed(msg.sender, token, amountOut);
        }
    }

    function _verifyMerkleData(
        address _user,
        uint256[] calldata _amounts,
        bytes32[] calldata _proof
    ) internal view returns (bool) {
        bytes32 leaf = keccak256(
            bytes.concat(keccak256(abi.encode(_user, _amounts)))
        );
        return MerkleProof.verify(_proof, merkleRoot, leaf);
    }
}
