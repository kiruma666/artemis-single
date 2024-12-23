// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "../Interfaces/IMerkleDistributorV2.sol";

contract MerkleDistributorFactory is AccessControlUpgradeable {
    address public merkleDistributorV2Beacon;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    event MerkleDistributorV2Created(address indexed _merkleDistributorV2);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _merkleDistributorV2Beacon) public initializer {
        __AccessControl_init();

        merkleDistributorV2Beacon = _merkleDistributorV2Beacon;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function createMerkleDistributorV2()
        external
        onlyRole(ADMIN_ROLE)
        returns (address)
    {
        BeaconProxy merkleDistributorV2 = new BeaconProxy(
            merkleDistributorV2Beacon,
            abi.encodeWithSelector(
                IMerkleDistributorV2.initialize.selector,
                msg.sender
            )
        );

        emit MerkleDistributorV2Created(address(merkleDistributorV2));

        return address(merkleDistributorV2);
    }
}
