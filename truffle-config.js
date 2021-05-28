var HDWalletProvider = require("@truffle/hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider({mnemonic, 
          providerOrUrl:"http://localhost:8545", 
          address_index	:	0,
          num_addresses:50});

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