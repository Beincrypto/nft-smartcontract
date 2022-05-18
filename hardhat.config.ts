import { existsSync, readFileSync } from 'fs'
import { BicNetworkConfig } from './types/config'
import { HardhatUserConfig, NetworksUserConfig, HardhatNetworkUserConfig, NetworkUserConfig } from 'hardhat/types'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import '@typechain/hardhat'

function createHardhatNetworkConfig(
  fork: boolean,
  rpcApiKey?: string,
  deployerPrivateKey?: string,
  testPrivateKey?: string,
  test2PrivateKey?: string,
): HardhatNetworkUserConfig {
  if (fork && rpcApiKey && deployerPrivateKey && testPrivateKey && test2PrivateKey) {
    return {
      // forking: {
      //  url: `https://mainnet.infura.io/v3/${rpcApiKey}`,
      // },
      chainId: 31337,
      allowUnlimitedContractSize: false,
      accounts: [
        {
          privateKey: deployerPrivateKey,
          balance: '10000000000000000000000',
        },
        {
          privateKey: testPrivateKey,
          balance: '10000000000000000000000',
        },
        {
          privateKey: test2PrivateKey,
          balance: '10000000000000000000000',
        },
      ],
    }
  }
  return {
    allowUnlimitedContractSize: false,
  }
}

function createRinkebyTestnetConfig(
  rpcApiKey: string,
  deployerPrivateKey: string,
  testPrivateKey: string,
  test2PrivateKey: string,
): NetworkUserConfig {
  return {
    url: `https://rinkeby.infura.io/v3/${rpcApiKey}`,
    accounts: [deployerPrivateKey, testPrivateKey, test2PrivateKey],
    chainId: 4,
  }
}

function createEthMainnetConfig(rpcApiKey: string, deployerPrivateKey: string): NetworkUserConfig {
  return {
    url: `https://mainnet.infura.io/v3/${rpcApiKey}`,
    accounts: [deployerPrivateKey],
    chainId: 1,
  }
}

function configureNetworks(networkConfig: BicNetworkConfig): NetworksUserConfig {
  if (
    networkConfig.rpcApiKey !== undefined &&
    networkConfig.deployerPrivateKey !== undefined &&
    networkConfig.testPrivateKey !== undefined &&
    networkConfig.test2PrivateKey !== undefined &&
    networkConfig.hardhatFork !== undefined
  ) {
    return {
      hardhat: createHardhatNetworkConfig(
        networkConfig.hardhatFork,
        networkConfig.rpcApiKey,
        networkConfig.deployerPrivateKey,
        networkConfig.testPrivateKey,
        networkConfig.test2PrivateKey,
      ),
      rinkeby_testnet: createRinkebyTestnetConfig(
        networkConfig.rpcApiKey,
        networkConfig.deployerPrivateKey,
        networkConfig.testPrivateKey,
        networkConfig.test2PrivateKey,
      ),
      eth_mainnet: createEthMainnetConfig(networkConfig.rpcApiKey, networkConfig.deployerPrivateKey),
    }
  } else {
    return {
      hardhat: createHardhatNetworkConfig(false, networkConfig.rpcApiKey),
    }
  }
}

let networkConfig: BicNetworkConfig
if (existsSync('./.env.local.json')) {
  networkConfig = JSON.parse(readFileSync('./.env.local.json').toString())
} else {
  networkConfig = JSON.parse(readFileSync('./.env.json').toString())
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      metadata: {
        bytecodeHash: 'none',
      },
    },
  },
  networks: configureNetworks(networkConfig),
  paths: {
    artifacts: 'build/artifacts',
    cache: 'build/cache',
    sources: 'contracts',
    deploy: 'src/deploy',
  },
  typechain: {
    outDir: 'build/typechain',
    target: 'ethers-v5',
  },
  namedAccounts: {
    deployer: 0,
    test: 1,
    test2: 2,
  },
  etherscan: {
    apiKey: networkConfig.scanApiKey,
  },
  mocha: {
    timeout: 30000,
  },
}

export default config
