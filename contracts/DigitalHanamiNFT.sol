// contracts/DigitalHanamiNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract DigitalHanamiNFT is ERC721A, ERC2981, Ownable {
    using Strings for uint256;

    enum Stage {
        Closed,
        Freemint,
        Presale,
        Sale
    }

    string private baseURI;
    string private notRevealedUri;
    string public constant BASE_EXTENSION = ".json";
    bytes32 public baseURIHash;
    uint256 public baseURIHashUpdateTime;

    Stage public currentStage;
    uint256 public immutable presaleMintMaxAmount;
    uint256 public immutable presaleMintPrice;
    uint256 public immutable saleMintPrice;
    uint256 public immutable maxSupply;

    bool public revealed = false;

    bytes32 private presaleMerkleRootHash;
    bytes32 private freeMintMerkleRootHash;
    uint256 public pendingFreeMint = 0;
    mapping(bytes32 => bool) public alreadyFreeMinted;

    event UpdateMetadataHash(bytes32 newHash);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _presaleMintMaxAmount,
        uint256 _presaleMintPrice,
        uint256 _saleMintPrice,
        uint256 _maxSupply
    ) ERC721A(string(_name), string(_symbol)) {
        presaleMintMaxAmount = _presaleMintMaxAmount;
        presaleMintPrice = _presaleMintPrice;
        saleMintPrice = _saleMintPrice;
        maxSupply = _maxSupply;
    }

    /**
     * @dev Set Base URI for all tokens.
     * The Base URI is checked against the baseURIHash.
     */
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        require(keccak256(abi.encode(_newBaseURI)) == baseURIHash, "invalid hash");
        baseURI = _newBaseURI;
    }

    /**
     * @dev Set Base URI Hash.
     * We set the Base URI Hash on sale start so it can be checked that the metadata had not changed.
     */
    function setBaseURIHash(bytes32 _newBaseURIHash) public onlyOwner {
        baseURIHash = _newBaseURIHash;
        // solhint-disable-next-line not-rely-on-time
        baseURIHashUpdateTime = block.timestamp;
        emit UpdateMetadataHash(_newBaseURIHash);
    }

    /**
     * @dev Set Not Revealed URI for all tokens, this will be returned while collection not revealed.
     */
    function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
        notRevealedUri = _notRevealedURI;
    }

    /**
     * @dev Set the royalty for secondary market sales.
     * The base denominator for percentage is internally set to 10000, so 1.00% should be set as 100.
     */
    function setRoyalty(address _receiver, uint96 _percentage) public onlyOwner {
        _setDefaultRoyalty(_receiver, _percentage);
    }

    /**
     * @dev Start Freemint.
     */
    function startFreemint() external onlyOwner {
        currentStage = Stage.Freemint;
    }

    /**
     * @dev Start Presale, only whitelisted addresses can mint (up to `presaleMintMaxAmount` tokens).
     */
    function startPresale() external onlyOwner {
        currentStage = Stage.Presale;
    }

    /**
     * @dev Start Public Sale, all addresses can mint, no limits.
     */
    function startPublicSale() external onlyOwner {
        currentStage = Stage.Sale;
    }

    /**
     * @dev Close Sale, can be used in case sale should be halted for any circumstance.
     * This will be used for contract testing mainly.
     */
    function closeSale() external onlyOwner {
        currentStage = Stage.Closed;
    }

    /**
     * @dev Set Pending Free Mint token amount.
     * The number of tokens that will be reserver for free minting,
     * they will be reserved even if not minted until the end of the sale.
     */
    function setPendingFreeMint(uint256 _pendingFreeMint) external onlyOwner {
        pendingFreeMint = _pendingFreeMint;
    }

    /**
     * @dev Set Presale Merkle Root Hash.
     * The root hash of the merkle tree for verification of the presale list.
     */
    function setPresaleMerkleRootHash(bytes32 _rootHash) external onlyOwner {
        presaleMerkleRootHash = _rootHash;
    }

    /**
     * @dev Set Free Mint Merkle Root Hash.
     * The root hash of the merkle tree for verification of the freemint list.
     */
    function setFreeMintMerkleRootHash(bytes32 _rootHash) external onlyOwner {
        freeMintMerkleRootHash = _rootHash;
    }

    /**
     * @dev Reveal the collection metadata.
     */
    function reveal(bool _state, string memory _newBaseURI) external onlyOwner {
        revealed = _state;
        setBaseURI(_newBaseURI);
    }

    /**
     * @dev NFT minting.
     * While on Presale stage, only addresses on whitelist are allowed to mint.
     */
    function mint(uint256 _mintAmount, bytes32[] calldata _merkleProof) external payable {
        require(currentStage == Stage.Presale || currentStage == Stage.Sale, "not open yet");
        require(_mintAmount > 0, "amount to mint invalid");
        // solhint-disable-next-line avoid-tx-origin
        require(tx.origin == msg.sender, "contracts not allowed");

        if (currentStage == Stage.Presale) {
            uint256 newMintsPerAddress = _numberMinted(msg.sender) + _mintAmount;
            require(newMintsPerAddress <= presaleMintMaxAmount, "cannot mint amount requested");

            require(presaleMintPrice * _mintAmount <= msg.value, "insufficient funds");

            bytes32 leafHash = keccak256(abi.encodePacked(msg.sender));
            require(MerkleProof.verify(_merkleProof, presaleMerkleRootHash, leafHash), "wallet not in presale list");
        } else {
            require(saleMintPrice * _mintAmount <= msg.value, "insufficient funds");
        }

        require(currentIndex + pendingFreeMint + _mintAmount <= maxSupply, "collection sold out");

        _mint(msg.sender, _mintAmount, "", false);
    }

    /**
     * @dev Free minting.
     * Addresses on free mint list can mint a token without cost.
     */
    function freeMint(bytes32[] calldata _merkleProof) external {
        require(currentStage != Stage.Closed, "not open yet");

        bytes32 leafHash = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, freeMintMerkleRootHash, leafHash), "wallet not in free mint list");

        require(!alreadyFreeMinted[leafHash], "already free minted");
        alreadyFreeMinted[leafHash] = true;
        pendingFreeMint -= 1;

        // Here we check only `<` instead of `<=` because not adding qty (1) to currentIndex
        require(currentIndex + pendingFreeMint < maxSupply, "collection sold out");

        _mint(msg.sender, 1, "", false);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        // solhint-disable-next-line reason-string
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        if (revealed == false) {
            return notRevealedUri;
        }

        string memory currentBaseURI = baseURI;
        return
            bytes(currentBaseURI).length > 0
                ? string(abi.encode(currentBaseURI, tokenId.toString(), BASE_EXTENSION))
                : "";
    }

    /**
     * @dev Withdraw contract funds.
     */
    function withdraw(address _to) public onlyOwner {
        require(_to != address(0), "zero address not allowed");
        uint256 balance = address(this).balance;
        // solhint-disable-next-line reason-string
        require(payable(_to).send(balance));
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721A, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
