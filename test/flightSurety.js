
var Test = require('../config/testConfig.js');
var truffleAssertations = require('truffle-assertions');;
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
        await config.flightSuretyApp.registerAirline(config.firstAirline, { from: config.owner });
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setTestingMode(true);
        }
        catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('(airline) owner is first airline', async () => {
        //ACT
        let result = await config.flightSuretyData.isAirline.call(config.owner)
        // ASSERT
        assert.equal(result, true, "Owner should be the very first active airline");
    });
    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

        // ARRANGE
        let newAirline = accounts[2];

        // ASSERT

        await truffleAssertations.reverts(config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline }));
    });

    it('(airline) can register an Airline using registerAirline()', async () => {

        // ARRANGE
        let newAirline = accounts[2];

        // ACT

        await config.flightSuretyApp.registerAirline(newAirline, { from: config.owner });
        await config.flightSuretyData.fund({ from: newAirline, value: web3.utils.toWei('10', 'ether') });

        let result = await config.flightSuretyData.isAirline.call(newAirline);

        // ASSERT
        assert.equal(result, true, "Airline should be able to register another airline if it hasn't provided funding");

    });

    it('(airline) consensus', async () => {

        // ARRANGE
        let secondAirline = accounts[2];
        let thirdAirline = accounts[3];
        let forthAirline = accounts[4];
        let fifthAirline = accounts[5];

        await config.flightSuretyApp.registerAirline(thirdAirline, { from: config.owner });
        await config.flightSuretyData.fund({ from: thirdAirline, value: web3.utils.toWei('10', 'ether') });

        await config.flightSuretyApp.registerAirline(forthAirline, { from: config.owner });
        await config.flightSuretyData.fund({ from: forthAirline, value: web3.utils.toWei('10', 'ether') });
        // ACT

        await config.flightSuretyApp.registerAirline(fifthAirline, { from: config.owner });
        await truffleAssertations.reverts(config.flightSuretyData.fund({ from: fifthAirline, value: web3.utils.toWei('10', 'ether') }));

        await config.flightSuretyApp.registerAirline(fifthAirline, { from: secondAirline });
        await truffleAssertations.reverts(config.flightSuretyData.fund({ from: fifthAirline, value: web3.utils.toWei('10', 'ether') }));

        await config.flightSuretyApp.registerAirline(fifthAirline, { from: thirdAirline });

        await config.flightSuretyData.fund({ from: fifthAirline, value: web3.utils.toWei('10', 'ether') });
        let result = await config.flightSuretyData.isAirline.call(fifthAirline);

        // ASSERT
        assert.equal(result, true, "airline should be registerd after multypart consensus");

    });

});
