import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry, AssetRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AssetRegistry Contract", function () {
  let identityRegistry: IdentityRegistry;
  let assetRegistry: AssetRegistry;
  let operator: SignerWithAddress;
  let nonOperator: SignerWithAddress;

  const adminId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:admin-001"));
  const user1Id = ethers.keccak256(ethers.toUtf8Bytes("did:snx:user-001"));
  const user2Id = ethers.keccak256(ethers.toUtf8Bytes("did:snx:user-002"));
  const fp = ethers.keccak256(ethers.toUtf8Bytes("fp"));

  const assetKey1 = ethers.keccak256(ethers.toUtf8Bytes("asset-device-esp32-01"));
  const manifestId1 = ethers.keccak256(ethers.toUtf8Bytes("manifest-001"));

  const ROLE_ADMIN = 1;
  const ROLE_USER = 8;

  beforeEach(async function () {
    [operator, nonOperator] = await ethers.getSigners();

    const IdFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdFactory.deploy();
    await identityRegistry.waitForDeployment();
    await identityRegistry.register(adminId, 0, ROLE_ADMIN, fp, ethers.ZeroHash, adminId);
    await identityRegistry.register(user1Id, 0, ROLE_USER, fp, ethers.ZeroHash, adminId);
    await identityRegistry.register(user2Id, 0, ROLE_USER, fp, ethers.ZeroHash, adminId);

    const AssetFactory = await ethers.getContractFactory("AssetRegistry");
    assetRegistry = await AssetFactory.deploy(await identityRegistry.getAddress());
    await assetRegistry.waitForDeployment();
  });

  it("should mint asset and assign custodial address owner", async function () {
    const tx = await assetRegistry.mintAsset(
      assetKey1,
      0, // AssetType.DEVICE
      user1Id,
      manifestId1,
      adminId
    );
    await tx.wait();

    const tokenId = 1n;
    expect(await assetRegistry.ownerPrincipal(tokenId)).to.equal(user1Id);

    const custodialAddress = await assetRegistry.principalToAddress(user1Id);
    expect(await assetRegistry.ownerOf(tokenId)).to.equal(custodialAddress);

    const uri = await assetRegistry.tokenURI(tokenId);
    expect(uri).to.include("snx://manifest/");
  });

  it("should allow policy-checked asset transfer between active users", async function () {
    await assetRegistry.mintAsset(assetKey1, 0, user1Id, manifestId1, adminId);

    // user1 transfers to user2
    await assetRegistry.transferAsset(1n, user2Id, user1Id);
    expect(await assetRegistry.ownerPrincipal(1n)).to.equal(user2Id);

    const newCustodial = await assetRegistry.principalToAddress(user2Id);
    expect(await assetRegistry.ownerOf(1n)).to.equal(newCustodial);
  });

  it("should reject transfer initiated by unauthorized principal", async function () {
    await assetRegistry.mintAsset(assetKey1, 0, user1Id, manifestId1, adminId);

    // user2 cannot transfer user1's asset
    await expect(
      assetRegistry.transferAsset(1n, user2Id, user2Id)
    ).to.be.revertedWithCustomError(assetRegistry, "UnauthorizedActor");
  });

  it("should revert on standard ERC-721 transfer functions per spec", async function () {
    await assetRegistry.mintAsset(assetKey1, 0, user1Id, manifestId1, adminId);

    const user1Addr = await assetRegistry.principalToAddress(user1Id);
    const user2Addr = await assetRegistry.principalToAddress(user2Id);

    await expect(
      assetRegistry.approve(user2Addr, 1n)
    ).to.be.revertedWithCustomError(assetRegistry, "StandardTransfersDisabled");

    await expect(
      assetRegistry.setApprovalForAll(user2Addr, true)
    ).to.be.revertedWithCustomError(assetRegistry, "StandardTransfersDisabled");

    await expect(
      assetRegistry.transferFrom(user1Addr, user2Addr, 1n)
    ).to.be.revertedWithCustomError(assetRegistry, "StandardTransfersDisabled");

    await expect(
      assetRegistry.getFunction("safeTransferFrom(address,address,uint256,bytes)")(user1Addr, user2Addr, 1n, "0x")
    ).to.be.revertedWithCustomError(assetRegistry, "StandardTransfersDisabled");
  });
});
