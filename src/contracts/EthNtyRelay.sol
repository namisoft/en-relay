/**
 * Created on 2019-12-27 11:31
 * @summary:
 * @author: Tuan Vu (tuanvd@gmail.com)
 */
pragma solidity ^0.5.0;

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
contract EthNtyRelay is EthNtyRelayStorage {
    using SafeMath for uint;

    // Checkpoint contract info
    EthCheckpoint.CheckpointContractInfo public checkpointContractInfo;

    // Block finality confirmations
    uint public finalityConfirms;

    // Initialize flag
    bool private initialized;

    // Define the first block (must be implemented by sub class)
    function _defineFirstBlock() internal returns (RelayedBlockHeader memory) ;

    // Define checkpoint contract info (must be implemented by sub class)
    function _defineCheckpointContractInfo() internal returns(address contractAddress, address[] memory trustedSigners);

    constructor(uint256 _finalityConfirms) internal{
        initialize(_finalityConfirms);
    }

    /**
   * @dev Object initializer
   * This method can be called only once to initialize this instance.
   * It is useful for proxy contract to call this method by DELEGATECALL
   * to initialize some contract data in the context of the proxy.
   */
    function initialize(uint256 _finalityConfirms) public {
        require(!initialized);

        finalityConfirms = _finalityConfirms;

        _setFirstBlock();

        _setCheckpointContractInfo();

        initialized = true;
    }

    function _setFirstBlock() private{
        RelayedBlockHeader memory toSetBlock = _defineFirstBlock();

        firstBlock = toSetBlock.hash;

        blocks[toSetBlock.hash] = toSetBlock;
        hasBlock[toSetBlock.hash] = true;

        hasFinalizedBlock[toSetBlock.hash] = true;

        blocksByHeight[toSetBlock.number].push(toSetBlock.hash);
        hasBlockHeight[toSetBlock.number] = true;

        maxBlockHeight = toSetBlock.number;

        longestBranchHead[toSetBlock.hash] = toSetBlock.hash;

        // Mark block as checkpoint block
        hasCheckpoint[toSetBlock.hash] = true;
        hasCpBlockByHeight[toSetBlock.number] = true;
        latestCheckpoint = toSetBlock.hash;
    }

    function _setCheckpointContractInfo() private{
        (address contractAddress, address[] memory trustedSigners) = _defineCheckpointContractInfo();
        checkpointContractInfo.contractAddress = contractAddress;
        for(uint i=0; i< trustedSigners.length; i++){
            checkpointContractInfo.hasTrustedSigner[trustedSigners[i]] = true;
        }
    }


    function relayBlock(bytes memory _rlpHeader) public payable returns (bool) {
        // Calculate block header hash
        uint blockHash = EthCommon.calcBlockHeaderHash(_rlpHeader);

        // Check block existing
        require(!hasBlock[blockHash], "Relay block failed: block already relayed");

        // Parse rlp-encoded block header into structure
        EthCommon.BlockHeader memory header = EthCommon.parseBlockHeader(_rlpHeader);

        // Check the existence of parent block
        require(hasBlock[header.parentHash], "Relay block failed: parent block not relayed yet");

        // Check block height
        require(header.number == blocks[header.parentHash].number.add(1), "Relay block failed: invalid block maxBlockHeight");

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
            time : header.timestamp,
            hash : blockHash,
            linkCheckpoint: blocks[header.parentHash].linkCheckpoint,
            accumulativeDiff : blocks[header.parentHash].accumulativeDiff.add(header.difficulty)
            });

        blocks[blockHash] = relayedBlock;
        hasBlock[blockHash] = true;

        blocksByHeight[header.number].push(blockHash);
        hasBlockHeight[header.number] = true;

        if (header.number > maxBlockHeight) {
            maxBlockHeight = header.number;
        }

        // Update longest branch head
        uint checkpointLongestBranchHead = longestBranchHead[relayedBlock.linkCheckpoint];
        if (relayedBlock.accumulativeDiff > blocks[checkpointLongestBranchHead].accumulativeDiff) {
            longestBranchHead[relayedBlock.linkCheckpoint] = blockHash;
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
        require(!hasCheckpoint[blockHash], "Block has been already relayed as a checkpoint before");

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
        // so we cannot calculate accumulative difficulty normally; instead, we set accumulative difficulty
        // for checkpoint block to a very big number (+plus block number)
        RelayedBlockHeader memory relayedBlock = RelayedBlockHeader({
            parentHash : header.parentHash,
            stateRoot : header.stateRoot,
            txRoot : header.transactionsRoot,
            receiptsRoot : header.receiptsRoot,
            number : header.number,
            difficulty : header.difficulty,
            time : header.timestamp,
            hash : blockHash,
            linkCheckpoint: blockHash,
            accumulativeDiff : header.number.add(0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE)
            });

        blocks[blockHash] = relayedBlock;
        hasBlock[blockHash] = true;
        // Finalize block immediately
        hasFinalizedBlock[blockHash] = true;
        // Mark block as checkpoint
        hasCheckpoint[blockHash] = true;
        // Mark block number as checkpoint
        hasCpBlockByHeight[blocks[blockHash].number] = true;
        // Update latest checkpoint var
        if (blocks[blockHash].number > blocks[latestCheckpoint].number) {
            latestCheckpoint = blockHash;
        }

        blocksByHeight[header.number].push(blockHash);
        hasBlockHeight[header.number] = true;

        if (header.number > maxBlockHeight) {
            maxBlockHeight = header.number;
        }


        // Check the other blocks with the same height: if other finalized block found, revert its finalized state!
        uint[] memory sameHeightBlocks = blocksByHeight[blocks[blockHash].number];
        for (uint count = 0; count < sameHeightBlocks.length; count++) {
            if (sameHeightBlocks[count] != blockHash && hasFinalizedBlock[sameHeightBlocks[count]]) {
                hasFinalizedBlock[sameHeightBlocks[count]] = false;
                // We can safety break now because it never has more than 01 other finalized block logically
                break;
            }
        }

        return true;
    }



    function finalizeBlock(uint _blockHash) public returns (bool){
        // Check block existing
        require(hasBlock[_blockHash], "Finalize block failed: block not relayed yet");

        // Check whether block already finalized or not
        require(!hasFinalizedBlock[_blockHash], "Finalize block failed: block already finalized");

        RelayedBlockHeader memory blockHeader = blocks[_blockHash];

        // Require prev block also finalized?
        //require(hasFinalizedBlock[blockHeader.parentHash], "Finalize block failed: parent block not finalized yet");

        // To be finalized, the block must:
        //        (belong to the longest chain) AND
        //        ((has a checkpoint ahead) OR (has at least `finalityConfirms` confirmations) OR (has a finalized child))
        // We check finality by traverse from longest branch head back to this block
        uint thisLongestBranchHead = longestBranchHead[blockHeader.linkCheckpoint];
        require(
            blocks[thisLongestBranchHead].number > blockHeader.number,
                "Finalize block failed: block is not belong to longest chain"
        );

        uint backFromBlock = thisLongestBranchHead;
        // Check if it has a checkpoint block ahead block @blockHeader: if has, we will update @backFromBlock to this checkpoint
        bool hasCheckpointAhead = false;
        for (uint i = blockHeader.number + 1; i <= blocks[thisLongestBranchHead].number; i++) {
            if (hasCpBlockByHeight[i]) {
                // Checkpoint at number @i found, then we will find out the checkpoint block hash
                // to assign @backFromBlock to this value
                uint[] memory blocksAtNumber = blocksByHeight[i];
                for (uint j = 0; j < blocksAtNumber.length; j++) {
                    if (hasCheckpoint[blocksAtNumber[j]]) {
                        // We will traverse back from this checkpoint block instead of @thisLongestBranchHead
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
        uint prevBlock = blocks[backFromBlock].hash;
        while (count < distanceToTraverseBack) {
            require(hasBlock[prevBlock], "Finalize block failed: block is not belong to longest chain");
            if (!hasFinalizedChild && hasFinalizedBlock[prevBlock]) {
                hasFinalizedChild = true;
            }
            prevBlock = blocks[prevBlock].parentHash;
            count = count.add(1);
        }

        require(
            prevBlock == _blockHash &&
        (hasCheckpointAhead || hasFinalizedChild || distanceToTraverseBack >= finalityConfirms),
            "Finalize block failed: not enough confirmations"
        );

        // Update block state to 'Finalized'
        hasFinalizedBlock[_blockHash] = true;

        // Check the other blocks with the same height: if other finalized block found, revert it!
        uint[] memory sameHeightBlocks = blocksByHeight[blockHeader.number];
        for (count = 0; count < sameHeightBlocks.length; count++) {
            if (sameHeightBlocks[count] != _blockHash && hasFinalizedBlock[sameHeightBlocks[count]]) {
                hasFinalizedBlock[sameHeightBlocks[count]] = false;
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
        if (!hasBlock[_blockHash]) {
            // Block not relayed yet
            return false;
        }

        return MerklePatriciaProof.verify(_rlpTx, _rlpPath, _rlpParentNodes, bytes32(blocks[_blockHash].txRoot));
    }
}

