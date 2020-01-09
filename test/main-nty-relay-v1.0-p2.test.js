/**
 * Author: Vu Duy Tuan - tuanvd@gmail.com
 * Date: 1/2/20
 * Time: 14:49
 */
import {ENRelayContract} from "./helpers/en-relay-contract";

const assert = require('assert');

const NextyConfig = {
    RpcUrl: 'http://rpc.testnet.nexty.io:8545',
    DefaultAccPk: '<please paste your private key here>',
    DefaultGas: 42000000
};

const compiledRelayContract = require('../src/contracts/built/MainNtyRelay');

const relayContract = new ENRelayContract(
    NextyConfig.RpcUrl,
    compiledRelayContract.abi,
    compiledRelayContract.bytecode
);

// This data file contain headers data from block #9069015 --> #9069050 of mainnet
const headersData = require("./data/mainnet_blocks(9069015-9069050)");


describe('<<Ethereum to Nexty>> Relay contract V1.0 Test 02', () => {
    before(async () => {
        relayContract.setCaller(NextyConfig.DefaultAccPk);
        relayContract.setDefaultGas(NextyConfig.DefaultGas);
        // Deploy contract to network
        await relayContract.deploy();
        // Set small finality confirms to test
        await relayContract.setFinalityConfirms(2);
    });

    it('longest chain logic test', async () => {
        // First, relay from block #9069016 -> #9069022
        await relayContract.relayBlock(headersData[1]);
        await relayContract.relayBlock(headersData[2]);
        await relayContract.relayBlock(headersData[3]);
        await relayContract.relayBlock(headersData[4]);
        await relayContract.relayBlock(headersData[5]);
        await relayContract.relayBlock(headersData[6]);
        await relayContract.relayBlock(headersData[7]);

        // Now, relay block UNCLE #9069023
        // hash: '0x83d75f1fddbb5e4674622efd809e927e1d33413badf06238dc687c1a942a5bbd',
        const uncle_9069023 = {
            difficulty: '2554028063157464',
            extraData: '0x50505945204143432d43484931',
            gasLimit: 9008453,
            gasUsed: 21000,
            logsBloom:
                '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
            miner: '0xD7a15BAEB7EA05C9660CBe03fB7999c2C2e57625',
            mixHash:
                '0xf968f8b0fb67f15b618b1fbd65870c0076ec2b724d47060f8ced8ce73d54c6c6',
            nonce: '0xfe72c03d6e3d96a1',
            number: 9069023,
            parentHash:
                '0xe576085159b526132b171514e5df474735cf816c6e0a1b39a30d0c1ff243a660',
            receiptsRoot:
                '0x056b23fbba480696b65fe5a59b8f2148a1299103c4f57df839233af2cf4ca2d2',
            sha3Uncles:
                '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
            stateRoot:
                '0xa0c65e74b822c1e61fdaf305721ab9d2f3f82bdbbc82fb8327c58cbb3c9c2c97',
            timestamp: 1575765078,
            transactionsRoot:
                '0x4cddb8cc4e852e420fbf0c280011376c1ae1dd1169bb34e9a419483ddb6c3922'
        };
        await relayContract.relayBlock(uncle_9069023);
        // Check that longest chain is point to this uncle block (0x83d75f1fddbb5e4674622efd809e927e1d33413badf06238dc687c1a942a5bbd)
        let longestChainHead = await relayContract.longestChainHead();
        assert.equal(longestChainHead, '0x83d75f1fddbb5e4674622efd809e927e1d33413badf06238dc687c1a942a5bbd');

        // Now, add mainnet-accepted block #9069023
        await relayContract.relayBlock(headersData[8]);

        // Because difficulty of #9069023 == difficulty of uncle #9069023, longest chain is still point to uncle #9069023
        longestChainHead = await relayContract.longestChainHead();
        assert.equal(longestChainHead, '0x83d75f1fddbb5e4674622efd809e927e1d33413badf06238dc687c1a942a5bbd');

        // Relay next block #9069024
        await relayContract.relayBlock(headersData[9]);

        // Now, longest chain must point to #9069024
        longestChainHead = await relayContract.longestChainHead();
        assert.equal(longestChainHead, headersData[9].hash);
    });


    it('finalized can be made on the longest chain path', async () => {
        // Relay one more block to enough confirmations for block #9069023
        await relayContract.relayBlock(headersData[10]);

        // Finalize from block #9069016 -> #9069022
        await relayContract.finalizeBlock(headersData[1].hash);
        await relayContract.finalizeBlock(headersData[2].hash);
        await relayContract.finalizeBlock(headersData[3].hash);
        await relayContract.finalizeBlock(headersData[4].hash);
        await relayContract.finalizeBlock(headersData[5].hash);
        await relayContract.finalizeBlock(headersData[6].hash);
        await relayContract.finalizeBlock(headersData[7].hash);

        // Try to finalize uncle block #9069023
        let finalized = await relayContract.finalizeBlock('0x83d75f1fddbb5e4674622efd809e927e1d33413badf06238dc687c1a942a5bbd');
        // It must FAILED because uncle #9069023 is not belong the longest chain
        assert.notEqual(finalized, null);
        assert.equal(finalized.success, false); // success = false

        // Try to finalize mainnet-accepted block #9069023
        finalized = await relayContract.finalizeBlock(headersData[8].hash);
        // It must success
        assert.notEqual(finalized, null);
        assert.equal(finalized.success, true);
    })

});
