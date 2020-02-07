/**
 * Author: Vu Duy Tuan - tuanvd@gmail.com
 * Date: 12/31/19
 * Time: 16:30
 */

const Web3 = require('web3');

export class ContractBase {
    constructor(web3Url, contractAbi, contractByteCode) {
        this.web3 = new Web3(web3Url);
        this.contractByteCode = contractByteCode;
        this.contractAbi = contractAbi;
        this.contractAddress = null;
    }

    deploy(params, callerPk, gas) {
        const callerAcc = this.web3.eth.accounts.privateKeyToAccount(callerPk);
        this.web3.eth.accounts.wallet.add(callerPk);
        const self = this;
        return new Promise((resolve, reject) => {
            new self.web3.eth.Contract(self.contractAbi)
                .deploy({data: self.contractByteCode, arguments: params})
                .send({
                    from: callerAcc.address,
                    gas: gas
                })
                .on('receipt', function (receipt) {
                    console.log(`Contract deployed successfully`);
                    console.log('   address: ' + receipt.contractAddress);
                    console.log('   txn: ' + receipt.transactionHash);
                    self.contractAddress = receipt.contractAddress;
                    resolve(receipt.contractAddress);
                })
                .on('error', function (error) {
                    console.log('Error on deploying contract: ' + error);
                    reject(error);
                });
        });
    }

    invokeSend(method, params, value, callerPk, gas) {
        const callerAcc = this.web3.eth.accounts.privateKeyToAccount(callerPk);
        this.web3.eth.accounts.wallet.add(callerPk);
        const self = this;
        return new Promise(((resolve, reject) => {
            try {
                new self.web3.eth.Contract(self.contractAbi, self.contractAddress).methods[method].apply(null, params)
                    .send({
                        from: callerAcc.address,
                        value: value,
                        gas: gas
                    })
                    .on('transactionHash', txHash => {
                        //console.log(`Invoking method ${self.contractAddress}.${method} tx sent successfully`);
                        //console.log(`  TxHash: ${JSON.stringify(txHash)}`);
                    })
                    .on('receipt', receipt => {
                        console.log(`Method ${self.contractAddress}.${method} invoked successfully: tx=${receipt.transactionHash}, gasUsed=${receipt.gasUsed}`);
                        resolve({success: true, receipt: receipt});
                    })
                    .on('error', (err, receipt) => {
                        // If no receipt, we have an error occurs during sending
                        if (!receipt) throw  err;
                        // Otherwise, this is out of gas error or execution failed (revert for example)
                        console.log(`Method ${self.contractAddress}.${method} invoked failure: err=${err.toString().split("\n")[0]}, gasUsed=${receipt.gasUsed}`);
                        resolve({success: false, receipt: receipt});
                    })
            } catch (err) {
                console.log(`Invoke send method ${self.contractAddress}.${method} failed: ${err.toString()}`);
                reject(err);
            }
        }));

    }

    invokeCall(method, params, callerAddress, gas){
        const self = this;
        return new Promise((resolve, reject) => {
            try {
                new self.web3.eth.Contract(self.contractAbi, self.contractAddress).methods[method].apply(null, params).call({
                    from: callerAddress,
                    gas: gas
                }).then(
                    result => {
                        console.log(`Invoke call method ${self.contractAddress}.${method} done: result=${JSON.stringify(result)}`);
                        resolve(result);
                    }
                ).catch((err) => {
                    console.log(`Invoke call method ${self.contractAddress}.${method} failed: ${err.toString()}`);
                    reject(err);
                })
            } catch (err) {
                console.log(`Invoke call method ${self.contractAddress}.${method} failed: ${err.toString()}`);
               reject(err);
            }
        })
    }
}
