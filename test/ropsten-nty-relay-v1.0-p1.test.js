/**
 * Author: Vu Duy Tuan - tuanvd@gmail.com
 * Date: 1/9/20
 * Time: 10:58
 */
import {ENRelayContract} from "./helpers/en-relay-contract";
import {NextyConfig} from "./config";

const assert = require('assert');

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

    it('the latest checkpoint must be #6419330', async () => {
        const latestCheckpoint = await relayContract.latestCheckpoint();
        assert.equal(latestCheckpoint, headersData1[0].hash);
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

        const longestBranchHead = await relayContract.longestBranchHead(headersData1[0].hash);
        assert.equal(longestBranchHead, headersData1[10].hash);

        const blockHeightMax = await relayContract.blockHeightMax();
        assert.equal(blockHeightMax, 6419340);
    });

    it('relay checkpoint block #6419343 without requiring prev block (#6419342) relayed', async () => {
        const block_6419343 = headersData1[13];
        const ret = await relayContract.relayCheckpointBlock(
            block_6419343,
                '0xf9026a0284a2bf8b7883010d3494ef79475013f154e6a65b54cb2742867791bf0b8480b90204d459fc46000000000000000000000000000000000000000000000000000000000061f30dc51bd44c255c661d282842b398ca42b1cbb8ba698bc8004e561d0c65d9e54c9eaf5ba4dc1a172966ead901964e2ae8e49ee8c8184314634a7a75493b633cf94200000000000000000000000000000000000000000000000000000000000000c200000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001b000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000002cf6c31932a01e0e602021ca86a1138ffb6b7860189f7fff787aea26332aa858d24cc72943bc4ddd2ea01dcdaa2919943901a1cc9c30be1593e3d69302099d496000000000000000000000000000000000000000000000000000000000000000223fd2fe57e5c3b858a702397204a073d595e71e2b1d32dc6861f39edd700a8fa518839ff37d37c2b9425d5620d9ccc8c41ce3a5018eba9ae1c0f5601ccaa6cdb2aa0941393e3579bbeaaf8e9fe511a789cc25ab28f74f280fd0d8d1583c7aaeef095a02e6079e3c47f8fee853b26b683c7e2b7fd94eada1d55e08d7168a7d57cd648f9',
            '0xc10a',
            '0xf9041bf851a08f2663ce7aa659b2c2a29ca78d0283bc4e916ce4471b4e66ad6e6e249146183380808080808080a001a102271ee0241cd1b0500a61d6d5376225bb61091ba66a7beb0e9e9609555b8080808080808080f9015180a07ae43460c1ede30210a9ad78c52dc103d176eb2c940ac60f153a96275f9bcaaaa089c2f2073630fcd351fdca8cf70b14ec6076d01f16ed40b6db0de19aeff8a768a0bb5e25f85ce5e60046683a6c0ec6825358288aea8b8856ce546cb5d3c2e2c643a01a707568d6c4be642877c194c5fdef0810dcdb62c0982073ff5e77f66ff20e87a0ea79b2a42b246d4df44bd350cf934c21933c95ff41bcc1a45ff544278a384a8ba0aa43aabc8f0a4fe2d5f8797d1a2ea8c7e6e2be8f6465911ec61b168f17701b7fa0654811db39a2727f6e6ef7aaa3f39edab488d738fe46d68e90023e6aad74fd64a0e8e89b4bd2c16c455b075b9a8faad976bf5cb8a72af8cdca8a01df9b1b051049a02ae2433ac9aa6e1ceb7e18a90b0f016a020cdb163fbca27264b7c0855fdfd801a006abe307361b819e968bcbdbf29b8e417f18a2e97695337678de33f3413678c6808080808080f9027120b9026df9026a0284a2bf8b7883010d3494ef79475013f154e6a65b54cb2742867791bf0b8480b90204d459fc46000000000000000000000000000000000000000000000000000000000061f30dc51bd44c255c661d282842b398ca42b1cbb8ba698bc8004e561d0c65d9e54c9eaf5ba4dc1a172966ead901964e2ae8e49ee8c8184314634a7a75493b633cf94200000000000000000000000000000000000000000000000000000000000000c200000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001b000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000002cf6c31932a01e0e602021ca86a1138ffb6b7860189f7fff787aea26332aa858d24cc72943bc4ddd2ea01dcdaa2919943901a1cc9c30be1593e3d69302099d496000000000000000000000000000000000000000000000000000000000000000223fd2fe57e5c3b858a702397204a073d595e71e2b1d32dc6861f39edd700a8fa518839ff37d37c2b9425d5620d9ccc8c41ce3a5018eba9ae1c0f5601ccaa6cdb2aa0941393e3579bbeaaf8e9fe511a789cc25ab28f74f280fd0d8d1583c7aaeef095a02e6079e3c47f8fee853b26b683c7e2b7fd94eada1d55e08d7168a7d57cd648f9'
        );
        assert.notEqual(ret, null);
        assert.equal(ret.success, true);
    });
});
