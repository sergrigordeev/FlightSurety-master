import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

require("babel-core/register");
require("babel-polyfill");
const GAS = 6721975
export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.appAddr = config.appAddress;
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.flights = new Map();
    }

    async initialize(callback) {

        this.web3.eth.getAccounts(async (error, accts) => {
            let self = this
            this.owner = accts[0];
            try {
                await this.flightSuretyData.methods.authorizeCaller(this.appAddr).send({ from: this.owner })
                let counter = 1;
                while (this.airlines.length < 5) {
                    let acc = accts[counter++]
                    console.log(acc)
                    this.airlines.push(acc);

                    console.log("registering airline");

                    let isAirline = await this.flightSuretyData.methods.isAirline(acc).call({ from: this.owner, gas: GAS });
                    console.log(7)
                    if (!isAirline) {
                        console.log(8)
                        await this.flightSuretyApp.methods
                            .registerAirline(acc)
                            .send({ from: this.owner, gas: GAS })

                        console.log('pay')
                        await this.flightSuretyData.methods.fund()
                            .send({ from: acc, value: this.web3.utils.toWei('10', 'ether'), gas: GAS })

                    }
                    console.log(9)
                    let ts = Math.floor(Date.now() / 1000)
                    let flightName = "Flight_" + counter
                    let payload = {
                        airline: acc,
                        flight: flightName,
                        timestamp: ts
                    }
                    console.log(0)
                    await this.flightSuretyApp.methods
                        .registerFlight(flightName, ts)
                        .send({ from: acc, gas: GAS })
                   
                        this.flights.set(flightName, payload)
                }
                console.log('contract inited')

            } catch (e) {
                console.log(e);
            }
            let counter = 5;
            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
   
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = self.flights.get(flight)
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }
}