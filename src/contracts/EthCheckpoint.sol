/**
 * Created on 2020-01-08 09:39
 * @summary:
 * @author: Tuan Vu (tuanvd@gmail.com)
 */
pragma solidity ^0.5.0;

library EthCheckpoint {
    struct CheckpointContractInfo {
        address contractAddress;
        mapping(address => bool) hasTrustedSigner;
    }

    function verifyCheckpoint(
        bytes memory _setCheckpointFuncCallInput,
        CheckpointContractInfo storage _checkpointContractInfo
    )
    internal
    view
    returns (bool){
        bytes4 funcSig;
        uint256 recentNumber;
        bytes32 recentHash;
        bytes32 hash;
        uint64 sectionIndex;
        uint8[] memory vs;
        bytes32[] memory rs;
        bytes32[] memory ss;

        (funcSig, recentNumber, recentHash, hash, sectionIndex, vs, rs, ss) =
        _abiDecodeSetCheckpointFuncCall(_setCheckpointFuncCallInput);

        // Validate function signature
        if (funcSig != bytes4(keccak256("SetCheckpoint(uint256,bytes32,bytes32,uint64,uint8[],bytes32[],bytes32[])"))) {
            return false;
        }

        // Validate length of signatures components
        if (vs.length != rs.length || vs.length != ss.length) {
            return false;
        }

        // EIP 191 style signatures
        //
        // Arguments when calculating hash to validate
        // 1: byte(0x19) - the initial 0x19 byte
        // 2: byte(0) - the version byte (data with intended validator)
        // 3: checkpoint contract address address
        // --  Application specific data
        // 4 : checkpoint section_index(uint64)
        // 5 : checkpoint hash (bytes32)
        //     hash = keccak256(checkpoint_index, section_head, cht_root, bloom_root)
        bytes32 signedHash = keccak256(abi.encodePacked(
                byte(0x19),
                byte(0),
                _checkpointContractInfo.contractAddress,
                sectionIndex,
                hash
            ));

        // Validate signatures
        for (uint i = 0; i < vs.length; i++) {
            address signer = ecrecover(signedHash, vs[i], rs[i], ss[i]);
            if (!_checkpointContractInfo.hasTrustedSigner[signer]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Decode abi-encoded data of SetCheckpoint function call
     **/
    function _abiDecodeSetCheckpointFuncCall(bytes memory _data) private pure
    returns (
        bytes4 sig,
        uint256 recentNumber,
        bytes32 recentHash,
        bytes32 hash,
        uint64 sectionIndex,
        uint8[] memory vs,
        bytes32[] memory rs,
        bytes32[] memory ss
    )
    {
        uint vsLen;
        uint rsLen;
        uint ssLen;

        uint vsDataPtr;
        uint rsDataPtr;
        uint ssDataPtr;

        // Extract fixed-size params and locate size/data position of array params
        // Note that in abi-encoded data, each data item is always padded to 32 bytes length
        assembly {
        // Get function signature (this is 4 bytes and no-padding)
            sig := mload(add(_data, 0x20))
        // Because function signature is exactly 4 bytes, params pointer is set at (0x20) + 4 = 36
            let paramsPtr := add(_data, 36)
        // Get fixed-size params value
            recentNumber := mload(paramsPtr)
            recentHash := mload(add(paramsPtr, 32))
            hash := mload(add(paramsPtr, 64))
            sectionIndex := mload(add(paramsPtr, 96))

        // Get length and data offset of vs array param
            let arrPos := mload(add(paramsPtr, 128))
            vsLen := mload(add(paramsPtr, arrPos))
            vsDataPtr := add(paramsPtr, add(arrPos, 32))

        // Get length and data offset of rs array param
            arrPos := mload(add(paramsPtr, 160))
            rsLen := mload(add(paramsPtr, arrPos))
            rsDataPtr := add(paramsPtr, add(arrPos, 32))

        // Get length and data offset of ss array param
            arrPos := mload(add(paramsPtr, 192))
            ssLen := mload(add(paramsPtr, arrPos))
            ssDataPtr := add(paramsPtr, add(arrPos, 32))
        }

        // Allocate memory for arrays
        vs = new uint8[](vsLen);
        rs = new bytes32[](rsLen);
        ss = new bytes32[](ssLen);

        assembly{
        // Copy data to rs
            let i := 0
            for {} lt(i, vsLen) {} {// while i < vsLen
                mstore(add(vs, add(32, mul(32, i))), mload(add(vsDataPtr, mul(32, i))))
                i := add(i, 1)
            }
        // Copy data to vs
            i := 0
            for {} lt(i, rsLen) {} {// while i < rsLen
                mstore(add(rs, add(32, mul(32, i))), mload(add(rsDataPtr, mul(32, i))))
                i := add(i, 1)
            }
        // Copy data to rr
            i := 0
            for {} lt(i, ssLen) {} {// while i < ssLen
                mstore(add(ss, add(32, mul(32, i))), mload(add(ssDataPtr, mul(32, i))))
                i := add(i, 1)
            }
        }

    }
}
