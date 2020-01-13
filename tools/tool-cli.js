const Web3 = require('web3');
const rlp = require('rlp');
const fs = require('fs-extra');
const path = require('path');

const config = require('./config');
const EthProof = require('./proof').EthProof;
const ethProof = require('eth-proof').GetProof;
//------------------------------------------------------------
// Parse commandline
//------------------------------------------------------------
const argv = require('minimist')(process.argv.slice(2));

// Get network ID from cmd
let networkId = 'default';
if (argv['network'] !== undefined && argv['network'] !== null) {
    networkId = argv['network'];
}
if (config.networks[networkId] === undefined || config.networks[networkId] === null) {
    console.log('Undefined network');
    process.exit();
}
const networkConfig = config.networks[networkId];

// Get method name from cmd
if (!argv['method']) {
    console.log('Unspecified method!');
    process.exit();
}
const methodName = argv['method'];


// Get params from cmd
let params = [];
if (argv['params'] !== undefined && argv['params'] !== null) {
    params = JSON.parse(argv['params']);
}

// Construct web3 object
const web3 = new Web3(networkConfig.url);


function toHexString(byteArray) {
    let s = '0x';
    byteArray.forEach(function (byte) {
        s += ('0' + (byte & 0xFF).toString(16)).slice(-2);
    });
    return s;
}

function createContractInstance(contractName, contractAddress){
    const builtContractPath = path.resolve(__dirname, config.builtContractPath, `${contractName}.json`);
    const {abi} = fs.readJsonSync(builtContractPath);
    return new web3.eth.Contract(abi, contractAddress);
}

//------------------------------------------------------------
// Methods definition
//------------------------------------------------------------

const methods = {
    // Get block by height
    getBlock: function (blockHeight) {
        return web3.eth.getBlock(blockHeight).then(block => {
            return {
                info: block,
                rlpHeader: toHexString(rlp.encode([
                    block.parentHash,
                    block.sha3Uncles,
                    block.miner,
                    block.stateRoot,
                    block.transactionsRoot,
                    block.receiptsRoot,
                    block.logsBloom,
                    web3.utils.toBN(block.difficulty),
                    block.number,
                    block.gasLimit,
                    block.gasUsed,
                    block.timestamp,
                    block.extraData,
                    block.mixHash,
                    block.nonce
                ]))
            }
        })
    },

    // Get blocks uncle
    getUncle: function (blockHeight, uncleIndex) {
        return web3.eth.getUncle(blockHeight, uncleIndex).then(block => {
            return {
                info: block,
                rlpHeader: toHexString(rlp.encode([
                    block.parentHash,
                    block.sha3Uncles,
                    block.miner,
                    block.stateRoot,
                    block.transactionsRoot,
                    block.receiptsRoot,
                    block.logsBloom,
                    web3.utils.toBN(block.difficulty),
                    block.number,
                    block.gasLimit,
                    block.gasUsed,
                    block.timestamp,
                    block.extraData,
                    block.mixHash,
                    block.nonce
                ]))
            }
        })
    },

    // Get blocks and save into file
    getBlocks: function (fromHeight, toHeight, fileName) {
        if (!fileName) fileName = `${networkId}_blocks(${fromHeight}-${toHeight}).json`;
        return (async () => {
            let ret = [];
            for (let i = fromHeight; i <= toHeight; i++) {
                const block = await web3.eth.getBlock(i);
                ret.push(block);
            }
            return Promise.resolve(ret);
        })().then(rs => {
            // Save to file
            fs.writeFileSync(fileName, JSON.stringify(rs));
            return `${rs.length} blocks saved to file ${fileName}!`;
        })
    },

    // Scan for blocks uncle
    scanUncles: function (fromHeight, toHeight) {
        let getBlockPromises = [];
        for (let i = fromHeight; i <= toHeight; i++) {
            getBlockPromises.push(web3.eth.getBlock(i).then(block => {
                return {
                    blockNumber: i,
                    uncles: (block && block.uncles) ? block.uncles.length : 0
                }
            }));
        }
        return Promise.all(getBlockPromises).then(rs => {
            let ret = [];
            for (let r of rs) {
                if (r.uncles > 0)
                    ret.push(r.blockNumber);
            }
            return ret.sort();
        })
    },

    // Get contract events
    getEvents(contractName, contractAddress, eventName, fromBlock ,toBlock){
      const contract = createContractInstance(contractName, contractAddress);
      return contract.getPastEvents(eventName, {fromBlock: fromBlock, toBlock: toBlock})
    },

    // Get Tx proof
    getTxProof(txHash){
        /*const ethProof = new EthProof(web3);
        return ethProof.getTxPoof(txHash).then(r => {
            console.log(rlp.decode(r.value));
            return JSON.stringify(r);
        });*/
        const getProofObj = new ethProof(networkConfig.url);
        return getProofObj.transactionProof(txHash).then(r =>{
            return {
                proof: '0x' + rlp.encode(r.txProof).toString('hex'),
                path: '0x' + rlp.encode([r.txIndex]).toString('hex')
            };
        });
    }
};

//------------------------------------------------------------
// Method invocation
//------------------------------------------------------------
methods[methodName].apply(null, params).then(console.log).catch(console.log);
