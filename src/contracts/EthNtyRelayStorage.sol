/**
 * Created on 2019-12-27
 * @summary: coding implement for EthNtyRelayStorage contract
 * @author: Tuan Vu (tuanvd@gmail.com)
 */
pragma solidity ^0.5.0;

/**
 * The EthNtyRelayStorage contract contains underlying data for EthNtyRelay contract
 */
 contract EthNtyRelayStorage {
 	struct RelayedBlockHeader {
 		uint parentHash;
 		uint stateRoot;
 		uint txRoot;
 		uint receiptsRoot;
 		uint number;
 		uint difficulty;
 		uint time;
 		uint hash;
		uint linkCheckpoint;	// the latest checkpoint that block links back to
		uint accumulativeDiff;	// accumulative difficulty from latest checkpoint until this block
 	}

 	// The first block header hash
 	uint public firstBlock;

 	// Blocks data, in the form: blockHeaderHash => RelayedBlockHeader
 	mapping (uint => RelayedBlockHeader) public blocks;
 	// Block existing stored map, in the form: blockHeaderHash => bool
 	mapping (uint => bool) public hasBlock;
 	// Blocks in 'Finalized' state
 	mapping (uint => bool) public hasFinalizedBlock;

 	// Valid relayed blocks for a block height, in the form: blockNumber => blockHeaderHash[]
 	mapping (uint => uint[]) blocksByHeight;
 	// Block height existing map, in the form: blockNumber => bool
 	mapping (uint => bool) public hasBlockHeight;

 	// Max block height stored
 	uint public maxBlockHeight;

	 // Longest branch head of each checkpoint, in the form: (checkpoint block hash) => (head block hash)
	 // (note that 'longest branch' means the branch which has biggest cumulative difficulty from checkpoint)
	 mapping(uint => uint) public longestBranchHead;

 	// Checkpoint block existing flag, in the form: (checkpoint block hash) => bool
	 mapping(uint => bool) public hasCheckpoint;
	 // Checkpoint block by height existing flag, in the form: (block height) => bool
	 mapping(uint => bool) public hasCpBlockByHeight;
	 // Latest check point block hash
	 uint public latestCheckpoint;
 }

