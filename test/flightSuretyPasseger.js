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

        let balance = await web3.eth.getBalance(config.flightSuretyData.address)

        // ACT
        let result = await config.flightSuretyApp.buyInsurance(config.owner, 'flight1', 123, { from: accounts[2], value: 100 });
        // ASSERT
        let balanceAfter = await web3.eth.getBalance(config.flightSuretyData.address)
        assert.equal(balanceAfter - balance, 100, "balance of data contract should increase");

    });

    it(`(passager) buy insurance for unregistered flight`, async function () {

        // ARRANGE
        let balance = await web3.eth.getBalance(config.flightSuretyData.address)

        // ACT
        await truffleAssertations.reverts(config.flightSuretyApp.buyInsurance(config.owner, 'flight2', 123, { from: accounts[2], value: 100 }));
        // ASSERT
        let balanceAfter = await web3.eth.getBalance(config.flightSuretyData.address)
        assert.equal(balanceAfter - balance, 0, "balance of data contract should increase");

    });
});