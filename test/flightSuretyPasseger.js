var Test = require('../config/testConfig.js');
var truffleAssertations = require('truffle-assertions');;
var BigNumber = require('bignumber.js');
const STATUS_CODE_LATE_AIRLINE = 20;
contract('[Passager] Flight Surety Tests', async (accounts) => {
    const flight = 'flight1'
    const timestamp = 123
    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
        await config.flightSuretyApp.registerAirline(config.firstAirline, { from: config.owner });
    });


    it(`(passager) buy insurance`, async function () {

        // ARRANGE
        const caller = accounts[2]
        let tx = await config.flightSuretyApp.registerFlight(flight, timestamp, { from: config.owner });

        let balance = await web3.eth.getBalance(config.flightSuretyData.address)

        // ACT
        let result = await config.flightSuretyApp.buyInsurance(config.owner, flight, timestamp, { from: caller, value: web3.utils.toWei('1', 'ether') });
        // ASSERT
        let balanceAfter = web3.utils.toBN(await web3.eth.getBalance(config.flightSuretyData.address))
        assert.equal(balanceAfter.sub(balance).toString(), web3.utils.toWei('1', 'ether'), "balance of data contract should increase");

    });

    it(`(passager) buy insurance for unregistered flight`, async function () {

        // ARRANGE
        const caller = accounts[2]
        let balance = web3.utils.toBN(await web3.eth.getBalance(config.flightSuretyData.address))
        // ACT
        await truffleAssertations.reverts(config.flightSuretyApp.buyInsurance(config.owner, flight, timestamp, { from: caller, value: 100 }));
        // ASSERT
        let balanceAfter = await web3.eth.getBalance(config.flightSuretyData.address)
        assert.equal(balanceAfter - balance, 0, "balance of data contract should increase");

    });

    it(`(passager) buy insurance with change`, async function () {

        // ARRANGE
        let caller = accounts[7]
        const balance = await web3.eth.getBalance(caller)
        // ACT
        let result = await config.flightSuretyApp.buyInsurance(config.owner, flight, timestamp, { from: caller, value: web3.utils.toWei('12', 'ether') });
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


    it(`(passager) requestInsurees flight is not registered`, async function () {

        // ARRANGE
        let caller = accounts[2]

        // ACT
        await truffleAssertations.reverts(config.flightSuretyApp.requestInsurees(caller, config.owner, 'flight2', timestamp, { from: caller }), 'flight is not registered');
        // ASSERT

    });

    it(`(passager) requestInsurees wrong status`, async function () {

        // ARRANGE
        let caller = accounts[2]

        // ACT
        await truffleAssertations.reverts(config.flightSuretyApp.requestInsurees(caller, config.owner, flight, timestamp, { from: caller }), 'wrong flight status');
        // ASSERT

    });


    it(`(passager) requestInsurees and withdrow`, async function () {

        // ARRANGE
        let caller = accounts[2]
        const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(caller))

        for (let a = 1; a < 10; a++) {
            await config.flightSuretyApp.registerOracle({ from: accounts[a], value: web3.utils.toWei('1', 'ether') });
            await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
        }


        await config.flightSuretyApp.fetchFlightStatus(
            config.owner,
            flight,
            timestamp
        )

        for (let a = 1; a < 10; a++) {

            // Get oracle information
            let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
            for (let idx = 0; idx < 3; idx++) {

                try {
                    // Submit a response...it will only be accepted if there is an Index match
                    await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.owner, flight, timestamp, STATUS_CODE_LATE_AIRLINE, { from: accounts[a] });
                    await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.owner, flight, timestamp, STATUS_CODE_LATE_AIRLINE, { from: accounts[a] });
                    await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.owner, flight, timestamp, STATUS_CODE_LATE_AIRLINE, { from: accounts[a] });
                    
                }
                catch (e) {

                }

            }
        }



        // ACT
        let result = await config.flightSuretyApp.requestInsurees(caller, config.owner, flight, timestamp, { from: caller });
        // ASSERT
        truffleAssertations.eventEmitted(result, 'InsureesCredited', {
            passager: caller,
            flight: flight,
            airline: config.owner,
            timestamp: web3.utils.toBN(123)
        });

        let payResult = await config.flightSuretyApp.withdrow({ from: caller });
        truffleAssertations.eventEmitted(payResult, 'InsureesPaid', {
            passager: caller,

        });

        const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(caller))
        assert.equal(balanceAfter.gt(balanceBefore), true, "Must be gt");

    });


    it(`(passager) requestInsurees and withdrow`, async function () {

        // ARRANGE
        let caller = accounts[2]

        // ACT
        let result = await config.flightSuretyApp.requestInsurees(caller, config.owner, flight, timestamp, { from: caller });
        // ASSERT
        truffleAssertations.eventEmitted(result, 'InsureesCredited', {
            passager: caller,
            flight: flight,
            airline: config.owner,
            timestamp: web3.utils.toBN(123)
        });
        await truffleAssertations.reverts(config.flightSuretyApp.withdrow({ from: caller }));



    });
});