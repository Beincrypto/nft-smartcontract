// contracts/DigitalHanamiNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract DigitalHanamiNFT is ERC721A, Ownable {
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
    uint256 public constant PRESALE_MINT_MAX_AMOUNT = 2;
    uint256 public constant PRESALE_MINT_PRICE = 0.08 ether;
    uint256 public constant SALE_MINT_PRICE = 0.1 ether;
    uint256 public constant TOTAL_SUPPLY = 10000;

    bool public revealed = false;

    bytes32 private presaleMerkleRootHash;
    bytes32 private freeMintMerkleRootHash;
    uint256 public pendingFreeMint = 0;
    address private treasuryWallet;
    mapping(bytes32 => bool) public alreadyFreeMinted;

    event UpdateMetadataHash(bytes32 newHash);

    constructor(
        string memory _name,
        string memory _symbol,
        address _treasuryWallet
    ) ERC721A(string(_name), string(_symbol)) {
        setTreasuryWallet(_treasuryWallet);
    }

    function setTreasuryWallet(address _newTreasuryWallet) public onlyOwner {
        require(_newTreasuryWallet != address(0), "zero address not allowed");
        treasuryWallet = _newTreasuryWallet;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        require(keccak256(abi.encode(_newBaseURI)) == baseURIHash, "invalid hash");
        baseURI = _newBaseURI;
    }

    function setBaseURIHash(bytes32 _newBaseURIHash) public onlyOwner {
        baseURIHash = _newBaseURIHash;
        // solhint-disable-next-line not-rely-on-time
        baseURIHashUpdateTime = block.timestamp;
        emit UpdateMetadataHash(_newBaseURIHash);
    }

    function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
        notRevealedUri = _notRevealedURI;
    }

    function startFreemint() external onlyOwner {
        currentStage = Stage.Freemint;
    }

    function startPresale() external onlyOwner {
        currentStage = Stage.Presale;
    }

    function startPublicSale() external onlyOwner {
        currentStage = Stage.Sale;
    }

    function closeSale() external onlyOwner {
        currentStage = Stage.Closed;
    }

    function setPendingFreeMint(uint256 _pendingFreeMint) external onlyOwner {
        pendingFreeMint = _pendingFreeMint;
    }

    function setPresaleMerkleRootHash(bytes32 _rootHash) external onlyOwner {
        presaleMerkleRootHash = _rootHash;
    }

    function setFreeMintMerkleRootHash(bytes32 _rootHash) external onlyOwner {
        freeMintMerkleRootHash = _rootHash;
    }

    function reveal(bool _state, string memory _newBaseURI) external onlyOwner {
        revealed = _state;
        setBaseURI(_newBaseURI);
    }

    function mint(uint256 _mintAmount, bytes32[] calldata _merkleProof) external payable {
        require(currentStage == Stage.Presale || currentStage == Stage.Sale, "not open yet");
        require(_mintAmount > 0, "amount to mint invalid");
        // solhint-disable-next-line avoid-tx-origin
        require(tx.origin == msg.sender, "contracts not allowed");

        if (currentStage == Stage.Presale) {
            uint256 newMintsPerAddress = _numberMinted(msg.sender) + _mintAmount;
            require(newMintsPerAddress <= PRESALE_MINT_MAX_AMOUNT, "cannot mint amount requested");

            require(PRESALE_MINT_PRICE * _mintAmount <= msg.value, "insufficient funds");

            bytes32 leafHash = keccak256(abi.encodePacked(msg.sender));
            require(MerkleProof.verify(_merkleProof, presaleMerkleRootHash, leafHash), "wallet not in presale list");
        } else {
            require(SALE_MINT_PRICE * _mintAmount <= msg.value, "insufficient funds");
        }

        require(currentIndex + pendingFreeMint + _mintAmount <= TOTAL_SUPPLY, "collection sold out");

        _mint(msg.sender, _mintAmount, "", false);
    }

    function freeMint(bytes32[] calldata _merkleProof) external {
        require(currentStage != Stage.Closed, "not open yet");

        bytes32 leafHash = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, freeMintMerkleRootHash, leafHash), "wallet not in free mint list");

        require(!alreadyFreeMinted[leafHash], "already free minted");
        alreadyFreeMinted[leafHash] = true;
        pendingFreeMint -= 1;

        // Here we check only `<` instead of `<=` because not adding qty (1) to currentIndex
        require(currentIndex + pendingFreeMint < TOTAL_SUPPLY, "collection sold out");

        _mint(msg.sender, 1, "", false);
    }

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

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        // solhint-disable-next-line reason-string
        require(payable(treasuryWallet).send(balance));
    }
}
