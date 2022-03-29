import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy } = deployments
  const { deployer, test, treasury } = await getNamedAccounts()
  let symbol = 'TDHNM'
  let treasuryWallet = test

  if (network.name === 'eth_mainnet') {
    symbol = 'DHNM'
    treasuryWallet = treasury // TODO: set address on hardhat.config
  }

  await deploy('DigitalHanamiNFT', {
    from: deployer,
    args: ['Digital Hanami', symbol, treasuryWallet],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['DigitalHanamiNFT']
export default deploy
