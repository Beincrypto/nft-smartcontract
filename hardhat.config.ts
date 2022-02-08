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
  alchemyApiKey?: string,
  deployerPrivateKey?: string,
  testPrivateKey?: string,
  test2PrivateKey?: string,
): HardhatNetworkUserConfig {
  if (fork && alchemyApiKey && deployerPrivateKey && testPrivateKey && test2PrivateKey) {
    return {
      forking: {
        url: `https://rinkeby.infura.io/v3/${alchemyApiKey}`,
      },
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
  alchemyApiKey: string,
  deployerPrivateKey: string,
  testPrivateKey: string,
  test2PrivateKey: string,
): NetworkUserConfig {
  return {
    url: `https://rinkeby.infura.io/v3/${alchemyApiKey}`,
    accounts: [deployerPrivateKey, testPrivateKey, test2PrivateKey],
  }
}

function createEthMainnetConfig(alchemyApiKey: string, deployerPrivateKey: string): NetworkUserConfig {
  return {
    url: `https://mainnet.infura.io/v3/${alchemyApiKey}`,
    accounts: [deployerPrivateKey],
  }
}

function configureNetworks(networkConfig: BicNetworkConfig): NetworksUserConfig {
  if (
    networkConfig.alchemyApiKey !== undefined &&
    networkConfig.deployerPrivateKey !== undefined &&
    networkConfig.testPrivateKey !== undefined &&
    networkConfig.test2PrivateKey !== undefined &&
    networkConfig.hardhatFork !== undefined
  ) {
    return {
      hardhat: createHardhatNetworkConfig(
        networkConfig.hardhatFork,
        networkConfig.alchemyApiKey,
        networkConfig.deployerPrivateKey,
        networkConfig.testPrivateKey,
        networkConfig.test2PrivateKey,
      ),
      rinkeby_testnet: createRinkebyTestnetConfig(
        networkConfig.alchemyApiKey,
        networkConfig.deployerPrivateKey,
        networkConfig.testPrivateKey,
        networkConfig.test2PrivateKey,
      ),
      eth_mainnet: createEthMainnetConfig(networkConfig.alchemyApiKey, networkConfig.deployerPrivateKey),
    }
  } else {
    return {
      hardhat: createHardhatNetworkConfig(false, networkConfig.alchemyApiKey),
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
    version: '0.8.3',
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
    apiKey: networkConfig.etherscanApiKey,
  },
  mocha: {
    timeout: 30000,
  },
}

export default config
