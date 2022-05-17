import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  let symbol = 'TDHNM'
  let name = 'Test Hanami'
  let presaleMintMaxAmount = 2
  let presaleMintPrice = '8000000000000000'
  let saleMintPrice = '10000000000000000'
  const maxSupply = 10000

  if (network.name === 'eth_mainnet') {
    symbol = 'DHNM'
    name = 'Digital Hanami'
    presaleMintPrice = '80000000000000000'
    saleMintPrice = '100000000000000000'
  }

  await deploy('DigitalHanamiNFT', {
    from: deployer,
    args: [name, symbol, presaleMintMaxAmount, presaleMintPrice, saleMintPrice, maxSupply],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['DigitalHanamiNFT']
export default deploy
