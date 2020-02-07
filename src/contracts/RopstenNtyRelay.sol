pragma solidity ^0.5.0;

import "./EthNtyRelay.sol";

contract RopstenNtyRelay is EthNtyRelay {
    string public constant version = "1.0.0";

    constructor(uint256 _finalityConfirms) EthNtyRelay(_finalityConfirms) public {
    }


    // Set the first block
    function _defineFirstBlock() internal returns (RelayedBlockHeader memory)  {
        // Hard code the first block is #6419330
        RelayedBlockHeader memory ret = RelayedBlockHeader({
            parentHash : 0x65d283e7a4ea14e86404c9ad855d59b4a49a9ae4602dd80857c130a8a57de12d,
            stateRoot : 0x87c377f10bfda590c8e3bfa6a6cafeb9736a251439766196ac508cfcbc795a32,
            txRoot : 0xf4cdf600a8b159e94c49f974ea2da5f05516098fab03dd231469e63982a2ab6e,
            receiptsRoot : 0xd8e77b10e522f5f2c1165c74baa0054fca5e90960cdf26b99892106f06f100f7,
            number : 6419330,
            difficulty : 2125760053,
            time : 1568874993,
            hash : 0xa73ab1a315660100b28ad2121ce7f9df8cd76d250048e5d0ff2f0f458573a1b8,
            linkCheckpoint: 0xa73ab1a315660100b28ad2121ce7f9df8cd76d250048e5d0ff2f0f458573a1b8,
            accumulativeDiff : 6419330 + 0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
            });

       return ret;
    }


    function _defineCheckpointContractInfo() internal returns(address contractAddress, address[] memory trustedSigners){
        contractAddress = 0xEF79475013f154E6A65b54cB2742867791bf0B84;
        trustedSigners = new address[](5);
        trustedSigners[0] = 0x32162F3581E88a5f62e8A61892B42C46E2c18f7b;
        trustedSigners[1] = 0x78d1aD571A1A09D60D9BBf25894b44e4C8859595;
        trustedSigners[2] = 0x286834935f4A8Cfb4FF4C77D5770C2775aE2b0E7;
        trustedSigners[3] = 0xb86e2B0Ab5A4B1373e40c51A7C712c70Ba2f9f8E;
        trustedSigners[4] = 0x0DF8fa387C602AE62559cC4aFa4972A7045d6707;
    }
}
