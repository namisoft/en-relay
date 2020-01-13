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
 	// Block existing map, in the form: blockHeaderHash => bool
 	mapping (uint => bool) public blockExisting;
 	// Blocks in 'Verified' state
 	mapping (uint => bool) public verifiedBlocks;
 	// Blocks in 'Finalized' state
 	mapping (uint => bool) public finalizedBlocks;

 	// Valid relayed blocks for a block height, in the form: blockNumber => blockHeaderHash[]
 	mapping (uint => uint[]) blocksByHeight;
 	// Block height existing map, in the form: blockNumber => bool
 	mapping (uint => bool) blocksByHeightExisting;

 	// Max block height stored
 	uint public blockHeightMax;

 	// Block header hash that points to longest chain head
 	// (please note that 'longest' chain is based on total difficulty)
 	// uint public longestChainHead;

	 // Longest branch head of each checkpoint, in the form: (checkpoint block hash) => (head block hash)
	 // (note that 'longest branch' means the branch which has biggest cumulative difficulty from checkpoint)
	 mapping(uint => uint) public longestBranchHead;

 	// Checkpoint blocks
	 mapping(uint => bool) checkpointBlocks;
	 // Checkpoint block by height
	 mapping(uint => bool) checkpointBlocksByHeight;
	 // Latest check point block
	 uint public latestCheckpoint;

 	constructor() public {

 	}


 }

