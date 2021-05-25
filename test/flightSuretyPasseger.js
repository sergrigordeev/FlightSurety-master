var Test = require('../config/testConfig.js');
var truffleAssertations = require('truffle-assertions');;
var BigNumber = require('bignumber.js');

contract('[Passager] Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
        await config.flightSuretyApp.registerAirline(config.firstAirline, { from: config.owner });
    });


    it(`(passager) buy insurance`, async function () {

        // ARRANGE
        let tx = await config.flightSuretyApp.registerFlight('flight1', 123, { from: config.owner });

        let balance = web3.utils.toBN(await web3.eth.getBalance(config.flightSuretyData.address))

        // ACT
        let result = await config.flightSuretyApp.buyInsurance(config.owner, 'flight1', 123, { from: accounts[2], value: 100 });
        // ASSERT
        let balanceAfter = web3.utils.toBN(await web3.eth.getBalance(config.flightSuretyData.address))
        assert.equal(balanceAfter.sub(balance).toString(), web3.utils.toBN('100').toString(), "balance of data contract should increase");

    });

    it(`(passager) buy insurance for unregistered flight`, async function () {

        // ARRANGE
        let balance = web3.utils.toBN(await web3.eth.getBalance(config.flightSuretyData.address))
        // ACT
        await truffleAssertations.reverts(config.flightSuretyApp.buyInsurance(config.owner, 'flight2', 123, { from: accounts[2], value: 100 }));
        // ASSERT
        let balanceAfter = web3.utils.toBN(await web3.eth.getBalance(config.flightSuretyData.address))
        assert.equal(balanceAfter.sub(balance).toString(), web3.utils.toBN(0).toString(), "balance of data contract should increase");

    });

    it(`(passager) buy insurance with change`, async function () {

        // ARRANGE
        let caller = accounts[7]
        const balance = await web3.eth.getBalance(caller)
        // ACT
        let result = await config.flightSuretyApp.buyInsurance(config.owner, 'flight1', 123, { from: caller, value: web3.utils.toWei('12', 'ether') });
        // ASSERT
        const balanceAfter = await web3.eth.getBalance(caller)

        const beforeInWei = web3.utils.toBN(balance)
        const afterInWei = web3.utils.toBN(balanceAfter)

        const gasUsed = web3.utils.toBN(result.receipt.gasUsed);

        // Obtain gasPrice from the transaction
        const tx = await web3.eth.getTransaction(result.tx);

        const gasPrice = web3.utils.toBN(tx.gasPrice);
        const totalGas = web3.utils.toBN(result.receipt.gasUsed)
        const totalGasUsed = gasPrice.mul(totalGas)
        // Final balance
        assert.equal(beforeInWei.sub(afterInWei).sub(totalGasUsed), web3.utils.toWei('1', 'ether'), "Must be equal");

    });
});