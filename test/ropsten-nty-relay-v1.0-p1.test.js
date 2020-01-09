/**
 * Author: Vu Duy Tuan - tuanvd@gmail.com
 * Date: 1/9/20
 * Time: 10:58
 */
import {ENRelayContract} from "./helpers/en-relay-contract";

const assert = require('assert');

const NextyConfig = {
    RpcUrl: 'http://rpc.testnet.nexty.io:8545',
    DefaultAccPk: '<please paste your private key here>',
    DefaultGas: 42000000
};

const compiledRelayContract = require('../src/contracts/built/RopstenNtyRelay');

const relayContract = new ENRelayContract(
    NextyConfig.RpcUrl,
    compiledRelayContract.abi,
    compiledRelayContract.bytecode
);

// This data file contain headers data from block #6419330 --> #6419350 of Ropsten testnet
const headersData1 = require("./data/ropsten_blocks(6419330-6419350)");
// This data file contain headers data from block #6419330 --> #6721815 of Ropsten testnet
const headersData2 = require("./data/ropsten_blocks(6721797-6721815)");

describe('<<Ropsten to Nexty>> Relay contract V1.0 Test 01', () => {
    before(async () => {
        relayContract.setCaller(NextyConfig.DefaultAccPk);
        relayContract.setDefaultGas(NextyConfig.DefaultGas);
        // Deploy contract to network
        await relayContract.deploy();
        // Set small finality confirms to test
        await relayContract.setFinalityConfirms(3);
    });

    it('relay contract deployed', () => {
        assert.ok(relayContract.contractAddress);
    });

    it('the first hard-coded block is #6419330', async () => {
        const firstBlock = await relayContract.firstBlock();
        assert.equal(firstBlock, headersData1[0].hash);
    });

    it('the latest checkpoint is set to #6419330', async () => {
        const firstBlock = await relayContract.latestCheckpoint();
        assert.equal(firstBlock, headersData1[0].hash);
    });

    it('relay valid normal blocks #6419331 -> #6419340', async () => {
        await relayContract.relayBlock(headersData1[1]);
        await relayContract.relayBlock(headersData1[2]);
        await relayContract.relayBlock(headersData1[3]);
        await relayContract.relayBlock(headersData1[4]);
        await relayContract.relayBlock(headersData1[5]);
        await relayContract.relayBlock(headersData1[6]);
        await relayContract.relayBlock(headersData1[7]);
        await relayContract.relayBlock(headersData1[8]);
        await relayContract.relayBlock(headersData1[9]);
        await relayContract.relayBlock(headersData1[10]);

        const longestChainHead = await relayContract.longestChainHead();
        assert.equal(longestChainHead, headersData1[10].hash);

        const blockHeightMax = await relayContract.blockHeightMax();
        assert.equal(blockHeightMax, 6419340);
    });

    it('relay checkpoint block #6419343 without requiring prev block (#6419342) relayed', async () => {
        const block_6419343 = headersData1[13];
        const ret = await relayContract.relayCheckpointBlock(
            block_6419343,
            '0xf9026903843b9aca0082fa7094ef79475013f154e6a65b54cb2742867791bf0b8480b90204d459fc46000000000000000000000000000000000000000000000000000000000066908498e188aa1c7ef215647f6d692bec81215a42c6c8894450f628cbfc507bb5dbe542dbc6704200c07b03eed6464cc0db417c6e739ce7d8aa03eb7ca033f730e55700000000000000000000000000000000000000000000000000000000000000cc00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001b000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000002fff63aa68202f385d49540ea7d5b67df48cae3812797136aa1057982c8ced598b830172fb07d3ce2d367dda0e2747764d32802dcb4278f8115ca2256789af71900000000000000000000000000000000000000000000000000000000000000025fc576f5a9934765be86fb6a0a6007718d6ae6f7c04bee9e7981354782d82db320b46372ab121d3930f3eccdcbf414cec67ef0240140f742273384d9e8e2f5832aa0aca8de95a6cc95b54ade9a02536119bee88bcdfe0274ef34c704af238c39cc30a0773488a2e1c261fb030531acac23d18f0dd9f56e07645249dfccf17e21100663',
            '0xc12e',
            '0xf9055af8d1a08f4eb144191fea2c08399e8e464ffba62c78802312e643b8485e1b8be24afc2fa0b0b8087e42f1cfc00befbf4d3f964f0bba46a2d7eb2d102c8b3c1c1ba4e14268a07c3055647ec056ed7f88489d26c66ef4b84fb15a902c8bac662d8a6d4b94cf75a00a620bb05ef7f7c96ef870f793a415e0bf525733258128eb523b3a77d3565b5aa0a63375900065c8de4de458791733f79e10926209ab52bfe6de6b03b61d972927808080a09293f8ab270842fa835d381f0f0c2ec80b75e79a09240bfd98498c955c21846c8080808080808080f90211a0a41f8a45d446cc252ccf0d0d24319e3b66af4d8359c4af3eb32bbda86cc6a0c9a0194c0f93d4229302922570deb2b4d61882a5ef45bb775af9a93c346a6e76b2d8a065fb6450c3c9ff295a29e3572ef1a22ae1c559c43d003b1a260fd6af83d0bd97a0a6a83bc0f97d580057b901d2befa6e5f0ea7acbb22929cd55cbb322c136c6d83a0440d80c8d3c292a974553a4e7fe5a8f7ff7bd8ef2dd504cb286072acdffbacd3a0b2095566ae4db6e5340cc56ffdea09da0486e84341c2b4a34604367956afd18ca0ea8f1913aeb583f630486edfc46ac0e81ca044cab74f7fe510d07fd1450774aca06589179e2100b15d5b9da1008698fb20b65fbe10a56ea874217ae7c2eefb0e01a0e2d62c25736d7e63e276efb3dcfd56310f41ab7ac2e2394075f296ea77f6db0ca0892d47926cd490983712b591ea2612539904b6e1e06a6c2dabacffefe43a24daa0cd7ce26190f2a73c301e857af40c59141f66c8ebc1c4b38c3ab364d6b4c3956ca0bd19b0879ea85af1776ef3c60c3a3c8e8fbf2911e7d9de6265cc4b1e98a9c669a02bebb002c1a6df9f788f0e515f07ee9b8895b07fd12b2e431af82a703c2fbf27a00668548b5185a1f21ab6d181163025f00c4c4fb011d5f7a22ce2b751492fc2f6a0cdc7dc2ee3005ded9170628d66a5a8f6b9062e595d5b5381e4d7ed298bf00f72a04b2c697aa37b56fab11490b819210317d985a1f8b24bb04867449f9149bd4a9d80f9027020b9026cf9026903843b9aca0082fa7094ef79475013f154e6a65b54cb2742867791bf0b8480b90204d459fc46000000000000000000000000000000000000000000000000000000000066908498e188aa1c7ef215647f6d692bec81215a42c6c8894450f628cbfc507bb5dbe542dbc6704200c07b03eed6464cc0db417c6e739ce7d8aa03eb7ca033f730e55700000000000000000000000000000000000000000000000000000000000000cc00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001b000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000002fff63aa68202f385d49540ea7d5b67df48cae3812797136aa1057982c8ced598b830172fb07d3ce2d367dda0e2747764d32802dcb4278f8115ca2256789af71900000000000000000000000000000000000000000000000000000000000000025fc576f5a9934765be86fb6a0a6007718d6ae6f7c04bee9e7981354782d82db320b46372ab121d3930f3eccdcbf414cec67ef0240140f742273384d9e8e2f5832aa0aca8de95a6cc95b54ade9a02536119bee88bcdfe0274ef34c704af238c39cc30a0773488a2e1c261fb030531acac23d18f0dd9f56e07645249dfccf17e21100663'
        );
        assert.notEqual(ret, null);
        assert.equal(ret.success, true);
    });
});
