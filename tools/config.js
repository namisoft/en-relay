/**
 * Author: Vu Duy Tuan - tuanvd@gmail.com
 * Date: 5/27/19
 * Time: 10:46 AM
 */
module.exports = {
    contractSourcePath: '../src/contracts',
    builtContractPath: '../src/contracts/built',
    deployedContractPath: '../src/contracts/deployed',

    networks: {
        ntytest: {
            url: "http://rpc.testnet.nexty.io:8545",
            defaultAccount: {
                address: '0xB02C0d1CE17cC49DAA7dA1bB944fc8A26D108510',
                privateKey: '<please paste your private key here>'
            },
            gas: 42000000
        },
        rinkeby: {
            url: "https://rinkeby.infura.io/v3/b3b525e45cc443988517e68d986d4df3",
            defaultAccount: {
                address: '0xcb54c756fd0c151aca1b2bff2c773175620e933a',
                privateKey: '<please paste your private key here>'
            },
            gas: 3000000
        },
        ropsten: {
            url: "https://ropsten.infura.io/v3/b3b525e45cc443988517e68d986d4df3",
            defaultAccount: {
                address: '0xcb54c756fd0c151aca1b2bff2c773175620e933a',
                privateKey: '<please paste your private key here>'
            },
            gas: 3000000
        },
        mainnet: {
            url: "https://mainnet.infura.io/v3/b3b525e45cc443988517e68d986d4df3",
            defaultAccount: {
                address: '0xcb54c756fd0c151aca1b2bff2c773175620e933a',
                privateKey: '<please paste your private key here>'
            },
            gas: 3000000
        }
    }
};
