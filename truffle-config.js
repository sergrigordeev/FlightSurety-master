var HDWalletProvider = require("@truffle/hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
module.exports = {

  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, 
          "http://localhost:8545", 
          	0,
          1);

      },
      network_id: '*',
    }
  },
  compilers: {
    solc: {
      version: "^0.8.0"
    }
  }
};