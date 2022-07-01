import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { ZERO_ADDRESS, ZERO_BYTES32 } from '../../src/utils/constants'

/**
 * Test Merkle Tree
 * Root Hash: 0x070e8db97b197cc0e4a1790c5e6c3667bab32d733db7f815fbe84f5824c7168d
 *
 * Address: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 (deployer)
 * Proof:['0x00314e565e0574cb412563df634608d76f5c59d9f817e85966100ec1d48005c0']
 *
 * Address: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 (test)
 * Proof:['0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9']
 *
 */
const ROOT_HASH = '0x070e8db97b197cc0e4a1790c5e6c3667bab32d733db7f815fbe84f5824c7168d'
const ADDR_0_PROOF = ['0x00314e565e0574cb412563df634608d76f5c59d9f817e85966100ec1d48005c0']
const ADDR_1_PROOF = ['0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9']

describe('DigitalHanamiNFT', () => {
  let DigitalHanamiNFT: ContractFactory
  let digitalHanamiNFT: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress, test2: SignerWithAddress

  before('Load contract factory (and deploy contracts, not needed to deploy here)', async () => {
    // await deployments.fixture()

    DigitalHanamiNFT = await ethers.getContractFactory('DigitalHanamiNFT')
    ;({ deployer, test, test2 } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    it('should create contract with correct params', async () => {
      const nft = await DigitalHanamiNFT.deploy(
        'Test Hanami',
        'TDHNM',
        2,
        ethers.BigNumber.from('8000000000000000'),
        ethers.BigNumber.from('10000000000000000'),
        10000,
      )
      await nft.deployed()

      expect(await nft.name()).to.be.equal('Test Hanami')
      expect(await nft.symbol()).to.be.equal('TDHNM')
      expect(await nft.presaleMintMaxAmount()).to.be.equal(2)
      expect(await nft.presaleMintPrice()).to.be.equal(ethers.BigNumber.from('8000000000000000'))
      expect(await nft.saleMintPrice()).to.be.equal(ethers.BigNumber.from('10000000000000000'))
      expect(await nft.maxSupply()).to.be.equal(10000)
    })
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      digitalHanamiNFT = await ethers.getContract('DigitalHanamiNFT')
    })

    it('should revert if not owner address calls setBaseURI()', async () => {
      await expect(digitalHanamiNFT.connect(test).setBaseURI('not really an URI')).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setBaseURIHash()', async () => {
      await expect(digitalHanamiNFT.connect(test).setBaseURIHash(ZERO_BYTES32)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setNotRevealedURI()', async () => {
      await expect(digitalHanamiNFT.connect(test).setNotRevealedURI('not really an URI')).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setRoyalty()', async () => {
      await expect(digitalHanamiNFT.connect(test).setRoyalty(ZERO_ADDRESS, 100)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls startFreemint()', async () => {
      await expect(digitalHanamiNFT.connect(test).startFreemint()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls startPresale()', async () => {
      await expect(digitalHanamiNFT.connect(test).startPresale()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls startPublicSale()', async () => {
      await expect(digitalHanamiNFT.connect(test).startPublicSale()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls closeSale()', async () => {
      await expect(digitalHanamiNFT.connect(test).closeSale()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls setPendingFreeMint()', async () => {
      await expect(digitalHanamiNFT.connect(test).setPendingFreeMint(0)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setPresaleMerkleRootHash()', async () => {
      await expect(digitalHanamiNFT.connect(test).setPresaleMerkleRootHash(ZERO_BYTES32)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setFreeMintMerkleRootHash()', async () => {
      await expect(digitalHanamiNFT.connect(test).setFreeMintMerkleRootHash(ZERO_BYTES32)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls reveal()', async () => {
      await expect(digitalHanamiNFT.connect(test).reveal(false, 'not really an URI')).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls withdraw()', async () => {
      await expect(digitalHanamiNFT.connect(test).withdraw(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })
  })

  describe('Test free minting', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      digitalHanamiNFT = await ethers.getContract('DigitalHanamiNFT')
      // configure smartcontract
      await digitalHanamiNFT.connect(deployer).setFreeMintMerkleRootHash(ROOT_HASH)
      await digitalHanamiNFT.connect(deployer).setPendingFreeMint(10)
    })

    it('should revert if minting not open', async () => {
      await expect(digitalHanamiNFT.connect(test).freeMint(ADDR_1_PROOF)).to.be.revertedWith('not open yet')
    })

    it('should free mint NFT', async () => {
      await digitalHanamiNFT.connect(deployer).startFreemint()
      await expect(digitalHanamiNFT.connect(test).freeMint(ADDR_1_PROOF))
        .to.emit(digitalHanamiNFT, 'Transfer')
        .withArgs(ZERO_ADDRESS, test.address, 0)
    })

    it('should revert because already minted', async () => {
      await expect(digitalHanamiNFT.connect(test).freeMint(ADDR_1_PROOF)).to.be.revertedWith('already free minted')
    })

    it('should revert if address not in freemint list', async () => {
      await expect(digitalHanamiNFT.connect(test2).freeMint(ADDR_0_PROOF)).to.be.revertedWith(
        'wallet not in free mint list',
      )
    })
  })

  describe('Test presale minting', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      digitalHanamiNFT = await ethers.getContract('DigitalHanamiNFT')
      // configure smartcontract
      await digitalHanamiNFT.connect(deployer).setPresaleMerkleRootHash(ROOT_HASH)
      // get wallet balance
      // const balance = await ethers.provider.getBalance(test.address);
      // console.log('test wallet:', ethers.utils.formatEther(balance))
      // const balance2 = await ethers.provider.getBalance(test2.address);
      // console.log('test2 wallet:', ethers.utils.formatEther(balance2))
    })

    it('should revert if minting not open', async () => {
      await expect(digitalHanamiNFT.connect(test).mint(0, ADDR_1_PROOF)).to.be.revertedWith('not open yet')
    })

    it('should revert if amount to mint invalid', async () => {
      // Start Presale
      await digitalHanamiNFT.connect(deployer).startPresale()

      await expect(digitalHanamiNFT.connect(test).mint(0, ADDR_1_PROOF)).to.be.revertedWith('amount to mint invalid')
    })

    it('should mint presale NFT', async () => {
      const overrides = {
        value: ethers.BigNumber.from('8000000000000000'),
      }
      await expect(digitalHanamiNFT.connect(test).mint(1, ADDR_1_PROOF, overrides))
        .to.emit(digitalHanamiNFT, 'Transfer')
        .withArgs(ZERO_ADDRESS, test.address, 0)
    })

    it('should revert if sent value is lower than price', async () => {
      const overrides = {
        value: ethers.BigNumber.from('7000000000000000'),
      }
      await expect(digitalHanamiNFT.connect(test).mint(1, ADDR_1_PROOF, overrides)).to.be.reverted
    })

    it('should mint second presale NFT', async () => {
      const overrides = {
        value: ethers.BigNumber.from('8000000000000000'),
      }
      await expect(digitalHanamiNFT.connect(test).mint(1, ADDR_1_PROOF, overrides))
        .to.emit(digitalHanamiNFT, 'Transfer')
        .withArgs(ZERO_ADDRESS, test.address, 1)
    })

    it('should revert if try to mint a third one', async () => {
      const overrides = {
        value: ethers.BigNumber.from('8000000000000000'),
      }
      await expect(digitalHanamiNFT.connect(test).mint(1, ADDR_1_PROOF, overrides)).to.be.revertedWith(
        'cannot mint amount requested',
      )
    })

    it('should revert if address not in whitelist', async () => {
      const overrides = {
        value: ethers.BigNumber.from('8000000000000000'),
      }
      await expect(digitalHanamiNFT.connect(test2).mint(1, ADDR_1_PROOF, overrides)).to.be.revertedWith(
        'wallet not in presale list',
      )
    })
  })
  // bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
  // bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;
  // bytes4 private constant _INTERFACE_ID_ERC721_ENUMERABLE = 0x780e9d63;
  // bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
})
