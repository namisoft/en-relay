/**
 * Created on 2019-12-27 11:31
 * @summary:
 * @author: Tuan Vu (tuanvd@gmail.com)
 */
pragma solidity ^0.5.0;

import "./Ownable.sol";
import "./SafeMath.sol";
import "./MerklePatriciaProof.sol";

import "./EthCommon.sol";
import "./EthUtils.sol";
import "./NextyPreCompiled.sol";
import "./EthNtyRelayStorage.sol";
import "./EthCheckpoint.sol";

/**
 * The EthNtyRelay virtual base contract is in charge of relaying blocks
 * from Ethereum PoW-compliant network to Nexty network.
 */
contract EthNtyRelay is EthNtyRelayStorage, Ownable {
    using SafeMath for uint;

    EthCheckpoint.CheckpointContractInfo public checkpointContractInfo;

    uint constant private DEFAULT_FINALITY_CONFIRMS = 13;

    uint public finalityConfirms;

    // Set the first block (must be implemented by sub class)
    function _setFirstBlock() internal;
    // Set checkpoint contract info (must be implemented by sub class)
    function _setCheckpointContractInfo() internal;

    constructor() internal{
        finalityConfirms = DEFAULT_FINALITY_CONFIRMS;

        _setFirstBlock();

        _setCheckpointContractInfo();
    }


    // Set block finality confirmations number.
    // Only contract owner can call this function.
    function setFinalityConfirms(uint _finalityConfirms) public onlyOwner returns (bool) {
        require(_finalityConfirms > 0, "Set finality confirmations failed: invalid value");
        if(_finalityConfirms != finalityConfirms){
            finalityConfirms = _finalityConfirms;
        }
        return true;
    }


    function relayBlock(bytes memory _rlpHeader) public payable returns (bool) {
        // Calculate block header hash
        uint headerHash = EthCommon.calcBlockHeaderHash(_rlpHeader);

        // Check block existing
        require(!blockExisting[headerHash], "Relay block failed: block already relayed");

        // Parse rlp-encoded block header into structure
        EthCommon.BlockHeader memory header = EthCommon.parseBlockHeader(_rlpHeader);

        // Check the existence of parent block
        require(blockExisting[header.parentHash], "Relay block failed: parent block not relayed yet");

        // Check block height
        require(header.number == blocks[header.parentHash].number.add(1), "Relay block failed: invalid block blockHeightMax");

        // Check timestamp
        require(header.timestamp > blocks[header.parentHash].time, "Relay block failed: invalid timestamp");

        // Check difficulty
        require(_checkDiffValidity(header.difficulty, blocks[header.parentHash].difficulty), "Relay block failed: invalid difficulty");

        // Verify block PoW
        uint sealHash = EthCommon.calcBlockSealHash(_rlpHeader);
        bool rVerified = NextyPreCompiled.verifyEthash(header.number, header.difficulty, header.nonce, header.mixHash, sealHash);
        require(rVerified, "Relay block failed: invalid PoW");

        // Save block header info
        RelayedBlockHeader memory relayedBlock = RelayedBlockHeader({
            parentHash : header.parentHash,
            stateRoot : header.stateRoot,
            txRoot : header.transactionsRoot,
            receiptsRoot : header.receiptsRoot,
            number : header.number,
            difficulty : header.difficulty,
            totalDifficulty : blocks[header.parentHash].totalDifficulty.add(header.difficulty),
            time : header.timestamp,
            hash : headerHash
            });

        blocks[headerHash] = relayedBlock;
        blockExisting[headerHash] = true;
        verifiedBlocks[headerHash] = true;

        blocksByHeight[header.number].push(headerHash);
        blocksByHeightExisting[header.number] = true;

        if (header.number > blockHeightMax) {
            blockHeightMax = header.number;
        }

        // Update longest chain head
        if (relayedBlock.totalDifficulty > blocks[longestChainHead].totalDifficulty) {
            longestChainHead = headerHash;
        }

        return true;
    }


    // Check the difficulty of block is valid or not
    // (the block difficulty adjustment is described here: https://github.com/ethereum/EIPs/issues/100)
    // Note that this is only 'minimal check' because we do not have 'block uncles' information to calculate exactly.
    // 'Minimal check' is enough to prevent someone from spamming relaying blocks with quite small difficulties
    function _checkDiffValidity(uint diff, uint parentDiff) private pure returns (bool){
        return diff >= parentDiff.sub((parentDiff / 10000) * 99);
    }


    function relayCheckpointBlock(
        bytes memory _rlpHeader,
        bytes memory _rlpSetCheckpointTx,
        bytes memory _rlpSetCheckpointTxIndex,
        bytes memory _rlpSetCheckpointTxProof
    ) public payable returns (bool){
        // Calculate block header hash
        uint blockHash = EthCommon.calcBlockHeaderHash(_rlpHeader);

        // Check if block has already been relayed as a checkpoint
        require(!checkpointBlocks[blockHash], "Block has been already relayed as a checkpoint before");

        // Parse rlp-encoded block header into structure
        EthCommon.BlockHeader memory header = EthCommon.parseBlockHeader(_rlpHeader);

        // Verify block PoW
        uint sealHash = EthCommon.calcBlockSealHash(_rlpHeader);
        bool rVerified = NextyPreCompiled.verifyEthash(header.number, header.difficulty, header.nonce, header.mixHash, sealHash);
        require(rVerified, "Relay block as a checkpoint failed: invalid PoW");

        // Verify SetCheckpoint Tx
        bool isProvenTx = MerklePatriciaProof.verify(
            _rlpSetCheckpointTx,
            _rlpSetCheckpointTxIndex,
            _rlpSetCheckpointTxProof,
            bytes32(header.transactionsRoot)
        );
        require(
            isProvenTx,
            "Relay block as a checkpoint failed: unproven SetCheckpoint Tx"
        );

        // Validate SetCheckpoint function call input data
        EthCommon.Transaction memory trans = EthCommon.parseTx(_rlpSetCheckpointTx);
        require(
            EthCheckpoint.verifyCheckpoint(trans.input, checkpointContractInfo),
            "Invalid SetCheckpoint function call input data"
        );

        // Save block header info
        // Note that relaying checkpoint block does NOT require parent block relayed,
        // so we cannot calculate total difficulty normally; instead, we set total difficulty
        // for checkpoint block to a very big number (+plus block number to guarantee @longestChainHead
        // is always point to correct value in the case we has all and ONLY checkpoint blocks relayed)
        RelayedBlockHeader memory relayedBlock = RelayedBlockHeader({
            parentHash : header.parentHash,
            stateRoot : header.stateRoot,
            txRoot : header.transactionsRoot,
            receiptsRoot : header.receiptsRoot,
            number : header.number,
            difficulty : header.difficulty,
            totalDifficulty : header.number.add(0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE),
            time : header.timestamp,
            hash : blockHash
            });

        blocks[blockHash] = relayedBlock;
        blockExisting[blockHash] = true;
        verifiedBlocks[blockHash] = true;
        // Finalize block immediately
        finalizedBlocks[blockHash] = true;
        // Mark block as checkpoint
        checkpointBlocks[blockHash] = true;
        // Mark block number as checkpoint
        checkpointBlocksByHeight[blocks[blockHash].number] = true;
        // Update latest checkpoint var
        if (blocks[blockHash].number > blocks[latestCheckpoint].number) {
            latestCheckpoint = blockHash;
        }

        blocksByHeight[header.number].push(blockHash);
        blocksByHeightExisting[header.number] = true;

        if (header.number > blockHeightMax) {
            blockHeightMax = header.number;
        }

        // Update longest chain head
        if (relayedBlock.totalDifficulty > blocks[longestChainHead].totalDifficulty) {
            longestChainHead = blockHash;
        }

        // Check the other blocks with the same height: if other finalized block found, revert its finalized state!
        uint[] memory sameHeightBlocks = blocksByHeight[blocks[blockHash].number];
        for (uint count = 0; count < sameHeightBlocks.length; count++) {
            if (sameHeightBlocks[count] != blockHash && finalizedBlocks[sameHeightBlocks[count]]) {
                finalizedBlocks[sameHeightBlocks[count]] = false;
                // We can safety break now because it never has more than 01 other finalized block logically
                break;
            }
        }

        return true;
    }



    function finalizeBlock(uint _blockHeaderHash) public returns (bool){
        // Check block existing
        require(blockExisting[_blockHeaderHash], "Finalize block failed: block not relayed yet");

        // Check whether block already finalized or not
        require(!finalizedBlocks[_blockHeaderHash], "Finalize block failed: block already finalized");

        RelayedBlockHeader memory blockHeader = blocks[_blockHeaderHash];

        // Require prev block also finalized?
        //require(finalizedBlocks[blockHeader.parentHash], "Finalize block failed: parent block not finalized yet");

        // To be finalized, the block must:
        //        (belong to the longest chain) AND
        //        ((has a checkpoint ahead) OR (has at least `finalityConfirms` confirmations) OR (has a finalized child))
        // We check finality by traverse from longest chain head back to this block
        require(blocks[longestChainHead].number > blockHeader.number, "Finalize block failed: block is not belong to longest chain");

        uint backFromBlock = longestChainHead;
        // Check if it has a checkpoint block ahead block @blockHeader: if has, we will update @backFromBlock to this checkpoint
        bool hasCheckpointAhead = false;
        for (uint i = blockHeader.number + 1; i <= blocks[longestChainHead].number; i++) {
            if (checkpointBlocksByHeight[i]) {
                // Checkpoint at number @i found, then we will find out the checkpoint block hash
                // to assign @backFromBlock to this value
                uint[] memory blocksAtNumber = blocksByHeight[i];
                for (uint j = 0; j < blocksAtNumber.length; j++) {
                    if (checkpointBlocks[blocksAtNumber[j]]) {
                        backFromBlock = blocksAtNumber[j];
                        hasCheckpointAhead = true;
                        break;
                    }
                }
                break;
            }
        }

        uint distanceToTraverseBack = blocks[backFromBlock].number - blockHeader.number;
        bool hasFinalizedChild = false;
        uint count = 0;
        uint prevBlock = blocks[longestChainHead].hash;
        while (count < distanceToTraverseBack) {
            require(blockExisting[prevBlock], "Finalize block failed: block is not belong to longest chain");
            if (!hasFinalizedChild && finalizedBlocks[prevBlock]) {
                hasFinalizedChild = true;
            }
            prevBlock = blocks[prevBlock].parentHash;
            count = count.add(1);
        }

        require(
            prevBlock == _blockHeaderHash &&
        (hasCheckpointAhead || hasFinalizedChild || distanceToTraverseBack >= finalityConfirms),
            "Finalize block failed: not enough confirmations"
        );

        // Update block state to 'Finalized'
        finalizedBlocks[_blockHeaderHash] = true;

        // Check the other blocks with the same height: if other finalized block found, revert it!
        uint[] memory sameHeightBlocks = blocksByHeight[blockHeader.number];
        for (count = 0; count < sameHeightBlocks.length; count++) {
            if (sameHeightBlocks[count] != _blockHeaderHash && finalizedBlocks[sameHeightBlocks[count]]) {
                finalizedBlocks[sameHeightBlocks[count]] = false;
                // We can safety break now because it never has more than 01 other finalized block logically
                break;
            }
        }

        return true;
    }

    function verifyTx(
        bytes memory _rlpTx,
        bytes memory _rlpPath,
        bytes memory _rlpParentNodes,
        uint256 _blockHash
    ) public view returns (bool){
        if (!blockExisting[_blockHash]) {
            // Block not relayed yet
            return false;
        }

        return MerklePatriciaProof.verify(_rlpTx, _rlpPath, _rlpParentNodes, bytes32(blocks[_blockHash].txRoot));
    }
}

