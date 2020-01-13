pragma solidity ^0.5.0;

import "./EthNtyRelay.sol";

contract MainNtyRelay is EthNtyRelay {
    string public constant version = "1.0.0";

    constructor() public{

    }

    // Set the first block
    function _defineFirstBlock() internal returns (RelayedBlockHeader memory) {
        // Hard code the first block is #9069015
        RelayedBlockHeader memory ret = RelayedBlockHeader({
            parentHash : 0x637ebdba5b5ee086732e52b746d893a952adfc82994d8ada987d5f77096d4355,
            stateRoot : 0xea1ae5cef6eeb461c47474b0aa4a17160f8aae203c389b7d3dde6ebb56a746a0,
            txRoot : 0xdc199152db6ae292b83f8c1bf11c068e415b9d5f96980e7c1decb1420068b078,
            receiptsRoot : 0xedc79dd361388db3ac716b3dfd7228b58c8aad5f440cb1a57fe17645b925d457,
            number : 9069015,
            difficulty : 2563089222256524,
            time : 1575764885,
            hash : 0x420590e149a2f90746dc51e45cd77992e15e9abc7a9a2279472467185a92f858,
            linkCheckpoint: 0x420590e149a2f90746dc51e45cd77992e15e9abc7a9a2279472467185a92f858,
            accumulativeDiff : 9069015 + 0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
            });
        return ret;
    }

    function _setCheckpointContractInfo() internal {
        // Hard-coded checkpoint contract info of mainnet
        checkpointContractInfo.contractAddress = 0x9a9070028361F7AAbeB3f2F2Dc07F82C4a98A02a;
        checkpointContractInfo.trustedSigners[0x1b2C260efc720BE89101890E4Db589b44E950527] = true;
        checkpointContractInfo.trustedSigners[0x78d1aD571A1A09D60D9BBf25894b44e4C8859595] = true;
        checkpointContractInfo.trustedSigners[0x286834935f4A8Cfb4FF4C77D5770C2775aE2b0E7] = true;
        checkpointContractInfo.trustedSigners[0xb86e2B0Ab5A4B1373e40c51A7C712c70Ba2f9f8E] = true;
    }
}
