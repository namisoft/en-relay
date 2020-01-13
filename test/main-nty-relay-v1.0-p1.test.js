/**
 * Author: Vu Duy Tuan - tuanvd@gmail.com
 * Date: 1/2/20
 * Time: 14:49
 */
import {ENRelayContract} from "./helpers/en-relay-contract";
import {NextyConfig} from "./config";

const assert = require('assert');

const compiledRelayContract = require('../src/contracts/built/MainNtyRelay');

const relayContract = new ENRelayContract(
    NextyConfig.RpcUrl,
    compiledRelayContract.abi,
    compiledRelayContract.bytecode
);

// This data file contain headers data from block #9069015 --> #9069050 of mainnet
const headersData = require("./data/mainnet_blocks(9069015-9069050)");

describe('<<Mainnet to Nexty>> Relay contract V1.0 Test 01', () => {
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

    it('finality confirms is set correctly', async () => {
        const finalityConfirms = await relayContract.getFinalityConfirms();
        assert.equal(finalityConfirms, 3);
    });

    it('relay next valid block #9069016', async () => {
        const block_9069016 = headersData[1];
        const ret = await relayContract.relayBlock(block_9069016);
        assert.notEqual(ret, null);
        assert.equal(ret.success, true);
    });

    it('relay next valid block #9069017', async () => {
        const block_9069017 = headersData[2];
        const ret = await relayContract.relayBlock(block_9069017);
        assert.notEqual(ret, null);
        assert.equal(ret.success, true);
    });

    it('relay next valid block #9069018', async () => {
        const block_9069018 = headersData[3];
        const ret = await relayContract.relayBlock(block_9069018);
        assert.notEqual(ret, null);
        assert.equal(ret.success, true);
    });

    it('finalize block #9069016 - not enough confirmations', async () => {
        const block_9069016 = headersData[1];
        const ret = await relayContract.finalizeBlock(block_9069016.hash);
        assert.notEqual(ret, null);
        // Must not be success because not enough confirmations
        assert.equal(ret.success, false);
    });

    it('relay next valid block #9069019', async () => {
        const block_9069019 = headersData[4];
        const ret = await relayContract.relayBlock(block_9069019);
        assert.notEqual(ret, null);
        assert.equal(ret.success, true);
    });

    it('finalize block #9069016 - enough confirmations', async () => {
        const block_9069016 = headersData[1];
        const ret = await relayContract.finalizeBlock(block_9069016.hash);
        assert.notEqual(ret, null);
        assert.equal(ret.success, true);
    });

    it('block #9069016 has been finalized', async () => {
        const finalized = await relayContract.finalizedBlocks(headersData[1].hash);
        assert.equal(finalized, true);
    });


    it('relay invalid block: wrong PoW', async () => {
        const block = headersData[5];    // block #9069020
        // Change mixHash to wrong value make PoW of this block invalidity
        block.mixHash = "0x3fc92ce02698b5ce38dc5b46e775c568450077ef29acca3b7d9b03ead32833cc";
        const ret = await relayContract.relayBlock(block);
        assert.notEqual(ret, null);
        assert.equal(ret.success, false);
    });


    it('relay invalid block: already relayed block', async () => {
        const block_9069018 = headersData[3];
        const ret = await relayContract.relayBlock(block_9069018);
        assert.notEqual(ret, null);
        assert.equal(ret.success, false);
    });


    it('relay invalid block: parent block not relayed yet', async () => {
        const block_9069022 = headersData[7];
        const ret = await relayContract.relayBlock(block_9069022);
        assert.notEqual(ret, null);
        assert.equal(ret.success, false);
    });

});
