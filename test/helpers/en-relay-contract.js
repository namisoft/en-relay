/**
 * Author: Vu Duy Tuan - tuanvd@gmail.com
 * Date: 12/31/19
 * Time: 16:04
 */

const Web3 = require('web3');
const rlp = require('rlp');

import {ContractBase} from './contract-base'

/**
 * ETH --> NTY Relay contract helper
 */
class ENRelayContract extends ContractBase {

    setCaller(callerPk) {
        this.callerPk = callerPk;
        this.callerAddress = this.web3.eth.accounts.privateKeyToAccount(callerPk).address;
    }

    setDefaultGas(gas) {
        this.defaultGas = gas;
    }

    deploy(finalityConfirms) {
        return super.deploy([finalityConfirms], this.callerPk, this.defaultGas)
            .catch(_ => null);
    }

    // setFinalityConfirms(confirms) {
    //     return this.invokeSend('setFinalityConfirms', [confirms], null, this.callerPk, this.defaultGas)
    //         .catch(_ => null);
    // }

    getFinalityConfirms() {
        return this.invokeCall('finalityConfirms', null, this.callerAddress, this.defaultGas)
            .then(r => {
                return Number(r);
            }).catch(_ => null)
    }

    firstBlock() {
        return this.invokeCall('firstBlock', null, this.callerAddress, this.defaultGas)
            .then(r => {
                return this.web3.utils.numberToHex(r);
            }).catch(_ => null)
    }

    longestBranchHead(checkpoint) {
        return this.invokeCall('longestBranchHead', [checkpoint], this.callerAddress, this.defaultGas)
            .then(r => {
                return this.web3.utils.numberToHex(r);
            }).catch(_ => null)
    }

    latestCheckpoint() {
        return this.invokeCall('latestCheckpoint', null, this.callerAddress, this.defaultGas)
            .then(r => {
                return this.web3.utils.numberToHex(r);
            }).catch(_ => null)
    }

    maxBlockHeight() {
        return this.invokeCall('maxBlockHeight', null, this.callerAddress, this.defaultGas)
            .catch(_ => null)
    }

    relayBlockRlp(rlpHeader) {
        return this.invokeSend('relayBlock', [rlpHeader], null, this.callerPk, this.defaultGas)
            .catch(_ => null);
    }

    relayBlock(blockHeader) {
        return this.relayBlockRlp(
            toHexString(rlp.encode([
                blockHeader.parentHash,
                blockHeader.sha3Uncles,
                blockHeader.miner,
                blockHeader.stateRoot,
                blockHeader.transactionsRoot,
                blockHeader.receiptsRoot,
                blockHeader.logsBloom,
                this.web3.utils.toBN(blockHeader.difficulty),
                blockHeader.number,
                blockHeader.gasLimit,
                blockHeader.gasUsed,
                blockHeader.timestamp,
                blockHeader.extraData,
                blockHeader.mixHash,
                blockHeader.nonce
            ]))
        ).then(r => {
            if(r.success) {
                console.log(`Block #${blockHeader.number} relayed successfully`);
            }else{
                console.log(`Block #${blockHeader.number} relayed failure`);
            }
            return r;
        });
    }

    relayCheckpointBlock(blockHeader,
                         rlpSetCheckpointTx,
                         rlpSetCheckpointTxIndex,
                         rlpSetCheckpointTxProof) {
        const rlpBlockHeader =
            toHexString(rlp.encode([
                blockHeader.parentHash,
                blockHeader.sha3Uncles,
                blockHeader.miner,
                blockHeader.stateRoot,
                blockHeader.transactionsRoot,
                blockHeader.receiptsRoot,
                blockHeader.logsBloom,
                this.web3.utils.toBN(blockHeader.difficulty),
                blockHeader.number,
                blockHeader.gasLimit,
                blockHeader.gasUsed,
                blockHeader.timestamp,
                blockHeader.extraData,
                blockHeader.mixHash,
                blockHeader.nonce
            ]));
        return this.invokeSend(
            'relayCheckpointBlock',
            [rlpBlockHeader, rlpSetCheckpointTx, rlpSetCheckpointTxIndex, rlpSetCheckpointTxProof],
            null,
            this.callerPk,
            this.defaultGas
        ).then(r => {
            if(r.success) {
                console.log(`Checkpoint block #${blockHeader.number} relayed successfully`);
            }else{
                console.log(`Checkpoint block #${blockHeader.number} relayed failure`);
            }
            return r;
        }).catch(_ => null);
    }

    finalizeBlock(blockHeaderHash) {
        return this.invokeSend('finalizeBlock', [blockHeaderHash], null, this.callerPk, this.defaultGas)
            .then(r => {
                if(r.success) {
                    console.log(`Block ${blockHeaderHash} finalized successfully`);
                }else{
                    console.log(`Block ${blockHeaderHash} finalized failure`);
                }
                return r;
            })
            .catch(_ => null);
    }

    hasFinalizedBlock(blockHeaderHash) {
        return this.invokeCall('hasFinalizedBlock', [blockHeaderHash], this.callerAddress, this.defaultGas)
            .then(r => {
                return Boolean(r);
            }).catch(_ => null)
    }
}

function toHexString(byteArray) {
    let s = '0x';
    byteArray.forEach(function (byte) {
        s += ('0' + (byte & 0xFF).toString(16)).slice(-2);
    });
    return s;
}

export {ENRelayContract};
