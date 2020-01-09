/**
 * Author: Vu Duy Tuan - tuanvd@gmail.com
 * Date: 1/6/20
 * Time: 17:56
 */

const Trie = require('merkle-patricia-tree');
const rlp = require('rlp');
const EthereumTx = require('ethereumjs-tx').Transaction;
const async = require('async');

class EthProof {
    constructor(web3) {
        this.web3 = web3;
    }

    getTxPoof(txHash) {
        let self = this;
        return new Promise(async (accept, reject) => {
            try {
                const chainId = await self.web3.eth.getChainId();
                self.web3.eth.getTransaction(txHash, function (e, transaction) {
                    if (e || !transaction) {
                        return reject(e || "transaction not found")
                    }
                    self.web3.eth.getBlock(transaction.blockHash, true, function (e, block) {
                        if (e || !block) {
                            return reject(e || "block not found")
                        }
                        let txTrie = new Trie();
                        async.map(block.transactions, function (siblingTx, cb2) {//need siblings to rebuild trie
                            let path = rlp.encode(siblingTx.transactionIndex);
                            let rawSignedSiblingTx = new EthereumTx(squanchTx(siblingTx), {chain: chainId}).serialize();
                            txTrie.put(path, rawSignedSiblingTx, function (error) {
                                if (error != null) {
                                    cb2(error, null);
                                } else {
                                    cb2(null, true)
                                }
                            })
                        }, function (e, r) {
                            txTrie.findPath(rlp.encode(transaction.transactionIndex), function (e, rawTxNode, remainder, stack) {
                                let prf = {
                                    blockHash: transaction.blockHash,
                                    blockNumber: block.number,
                                    parentNodes: '0x' + rlp.encode(rawStack(stack)).toString('hex'),
                                    path: transaction.transactionIndex,
                                    value: '0x' + rlp.encode(rawTxNode.value).toString('hex')
                                };
                                return accept(prf)
                            })
                        });
                    })
                })
            } catch (e) {
                return reject(e)
            }
        })
    }
}

const squanchTx = (tx) => {
    tx.nonce = '0x' + Number(tx.nonce).toString(16);
    tx.gasPrice = '0x' + Number(tx.gasPrice).toString(16);
    tx.value = '0x' + Number(tx.value).toString(16);
    return tx;
};

const rawStack = (input) => {
    let output = [];
    for (let i = 0; i < input.length; i++) {
        output.push(input[i].raw)
    }
    return output
};

module.exports = {EthProof};
