// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./OperatorAccess.sol";
import "./IdentityRegistry.sol";

/**
 * @title AssetRegistry
 * @notice ERC-721 based digital asset registry with policy-checked transfers and custodial accounts.
 * @dev Spec: docs/04_CONTRACTS.md section 2.4
 */
contract AssetRegistry is ERC721, OperatorAccess {
    using Strings for uint256;

    enum AssetType { DEVICE, FILE, DOCUMENT, LICENSE, OTHER }
    enum AssetStatus { ACTIVE, MAINTENANCE, RETIRED }

    struct Asset {
        bytes32 assetKey;
        AssetType aType;
        bytes32 ownerId;
        bytes32 metadataManifestId;
        AssetStatus status;
        uint64 createdAt;
    }

    IdentityRegistry public immutable identityRegistry;
    uint256 private _nextTokenId = 1;

    mapping(uint256 => Asset) private _assets;
    mapping(bytes32 => uint256) private _assetKeyToTokenId;

    error StandardTransfersDisabled();
    error AssetNotFound(uint256 tokenId);
    error AssetKeyAlreadyExists(bytes32 key);
    error UnauthorizedActor(bytes32 actor);
    error RecipientNotActive(bytes32 toId);

    event AssetMinted(uint256 indexed tokenId, bytes32 indexed assetKey, bytes32 indexed ownerId, AssetType t);
    event AssetTransferred(uint256 indexed tokenId, bytes32 indexed fromId, bytes32 indexed toId, bytes32 actor);
    event AssetStatusChanged(uint256 indexed tokenId, AssetStatus s, bytes32 actor);
    event AssetMetadataUpdated(uint256 indexed tokenId, bytes32 newManifestId, bytes32 actor);

    constructor(address _identityRegistry)
        ERC721("SecureNodeX Asset", "SNX-AST")
        OperatorAccess()
    {
        identityRegistry = IdentityRegistry(_identityRegistry);
    }

    function principalToAddress(bytes32 principalId) public pure returns (address) {
        return address(uint160(uint256(principalId)));
    }

    function mintAsset(
        bytes32 assetKey,
        AssetType t,
        bytes32 ownerId,
        bytes32 metadataManifestId,
        bytes32 actor
    ) external onlyOperator returns (uint256 tokenId) {
        if (_assetKeyToTokenId[assetKey] != 0) revert AssetKeyAlreadyExists(assetKey);
        if (!identityRegistry.isActive(actor)) revert UnauthorizedActor(actor);

        bool isActorAdmin = identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN());
        bool isActorManager = identityRegistry.hasRole(actor, identityRegistry.ROLE_MANAGER());
        if (!isActorAdmin && !isActorManager) revert UnauthorizedActor(actor);

        if (!identityRegistry.isActive(ownerId)) revert RecipientNotActive(ownerId);

        tokenId = _nextTokenId++;
        address ownerAddress = principalToAddress(ownerId);

        _assets[tokenId] = Asset({
            assetKey: assetKey,
            aType: t,
            ownerId: ownerId,
            metadataManifestId: metadataManifestId,
            status: AssetStatus.ACTIVE,
            createdAt: uint64(block.timestamp)
        });
        _assetKeyToTokenId[assetKey] = tokenId;

        _safeMint(ownerAddress, tokenId);

        emit AssetMinted(tokenId, assetKey, ownerId, t);
    }

    function transferAsset(
        uint256 tokenId,
        bytes32 toId,
        bytes32 actor
    ) external onlyOperator {
        if (_assets[tokenId].createdAt == 0) revert AssetNotFound(tokenId);
        if (!identityRegistry.isActive(actor)) revert UnauthorizedActor(actor);
        if (!identityRegistry.isActive(toId)) revert RecipientNotActive(toId);

        Asset storage asset = _assets[tokenId];
        bytes32 fromId = asset.ownerId;

        bool isOwner = (actor == fromId);
        bool isActorAdmin = identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN());
        bool isActorManager = identityRegistry.hasRole(actor, identityRegistry.ROLE_MANAGER());

        if (!isOwner && !isActorAdmin && !isActorManager) {
            revert UnauthorizedActor(actor);
        }

        address fromAddress = principalToAddress(fromId);
        address toAddress = principalToAddress(toId);

        asset.ownerId = toId;
        _transfer(fromAddress, toAddress, tokenId);

        emit AssetTransferred(tokenId, fromId, toId, actor);
    }

    function setAssetStatus(
        uint256 tokenId,
        AssetStatus s,
        bytes32 actor
    ) external onlyOperator {
        if (_assets[tokenId].createdAt == 0) revert AssetNotFound(tokenId);
        if (!identityRegistry.isActive(actor)) revert UnauthorizedActor(actor);

        Asset storage asset = _assets[tokenId];
        bool isOwner = (actor == asset.ownerId);
        bool isActorAdmin = identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN());
        bool isActorManager = identityRegistry.hasRole(actor, identityRegistry.ROLE_MANAGER());

        if (!isOwner && !isActorAdmin && !isActorManager) {
            revert UnauthorizedActor(actor);
        }

        asset.status = s;
        emit AssetStatusChanged(tokenId, s, actor);
    }

    function updateMetadata(
        uint256 tokenId,
        bytes32 newManifestId,
        bytes32 actor
    ) external onlyOperator {
        if (_assets[tokenId].createdAt == 0) revert AssetNotFound(tokenId);
        if (!identityRegistry.isActive(actor)) revert UnauthorizedActor(actor);

        Asset storage asset = _assets[tokenId];
        bool isOwner = (actor == asset.ownerId);
        bool isActorAdmin = identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN());
        bool isActorManager = identityRegistry.hasRole(actor, identityRegistry.ROLE_MANAGER());

        if (!isOwner && !isActorAdmin && !isActorManager) {
            revert UnauthorizedActor(actor);
        }

        asset.metadataManifestId = newManifestId;
        emit AssetMetadataUpdated(tokenId, newManifestId, actor);
    }

    function ownerPrincipal(uint256 tokenId) external view returns (bytes32) {
        if (_assets[tokenId].createdAt == 0) revert AssetNotFound(tokenId);
        return _assets[tokenId].ownerId;
    }

    function getAsset(uint256 tokenId) external view returns (Asset memory) {
        if (_assets[tokenId].createdAt == 0) revert AssetNotFound(tokenId);
        return _assets[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_assets[tokenId].createdAt == 0) revert AssetNotFound(tokenId);
        bytes32 manifestId = _assets[tokenId].metadataManifestId;
        return string(abi.encodePacked("snx://manifest/", _toHexString(manifestId)));
    }

    function _toHexString(bytes32 value) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            str[i * 2] = alphabet[uint8(value[i] >> 4)];
            str[1 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }

    // Disable standard ERC-721 transfer functions per docs/04 section 2.4
    function approve(address, uint256) public pure override {
        revert StandardTransfersDisabled();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert StandardTransfersDisabled();
    }

    function transferFrom(address, address, uint256) public pure override {
        revert StandardTransfersDisabled();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert StandardTransfersDisabled();
    }
}
