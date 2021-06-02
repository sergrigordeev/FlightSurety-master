require("babel-core/register");
require("babel-polyfill");

import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECH = 40;
const STATUS_CODE_LATE_OTHER = 50;

const statuses = [ 
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECH,
  STATUS_CODE_LATE_OTHER
];
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
let randomStatus = ()=> statuses[getRandomInt(statuses.length)];
const ORACLES_COUNT = 30
const FIRST_ORACLE_IDX = 10

let oracles = new Map();

const GAS = 6721975
const registerOracle = async () => {
  console.log(flightSuretyApp.methods)

  let accs = await web3.eth.getAccounts();
  for (let i = FIRST_ORACLE_IDX; i < FIRST_ORACLE_IDX + ORACLES_COUNT; i++) {
    try {
      console.log(await web3.eth.getBalance(accs[i]));
      await flightSuretyApp.methods
        .registerOracle().send(
          {
            from: accs[i],
            value: web3.utils.toWei('1', 'ether'),
            gas: GAS
          })

      let indexes = await flightSuretyApp.methods
        .getMyIndexes().call(
          {
            from: accs[i],
            gas: GAS
          })
      oracles.set(accs[i], indexes)
    } catch (e) {
      console.log(e)
    }
    console.log(i + " oracle is registered: " + accs[i])
  }

  console.log(oracles)
}

(async () => {
  console.log("Register Oracles");
  await registerOracle();
})();

flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, async function (error, event) {
  if (error) console.log(error)
  for (const [key, value] of oracles) {
    for (let idx = 0; idx < 3; idx++) {
      if (event.returnValues.index == value[idx]) {
        try {
          
          let status = randomStatus();
          console.log(`${key} - ${value[idx]}: ${status}`)
          await flightSuretyApp.methods
            .submitOracleResponse(
              value[idx],
              event.returnValues.airline,
              event.returnValues.flight,
              event.returnValues.timestamp,
              status)
            .send(
              {
                from: key,
                gas: GAS
              });
        }
        catch (e) {
          console.log(e)
        }
      }
    }


  };
  
});
flightSuretyApp.events.FlightUpdated({
  fromBlock: 0
}, async function (error, event) {
  if (error) console.log(error)
  if (event) console.log(event)
  
  
});
const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

export default app;

