import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry, DataRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DataRegistry Contract", function () {
  let identityRegistry: IdentityRegistry;
  let dataRegistry: DataRegistry;
  let operator: SignerWithAddress;
  let nonOperator: SignerWithAddress;

  const adminId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:admin-001"));
  const user1Id = ethers.keccak256(ethers.toUtf8Bytes("did:snx:user-001"));
  const user2Id = ethers.keccak256(ethers.toUtf8Bytes("did:snx:user-002"));
  const fp = ethers.keccak256(ethers.toUtf8Bytes("fp"));

  const obj1Id = ethers.keccak256(ethers.toUtf8Bytes("object-001"));
  const manifestId = ethers.keccak256(ethers.toUtf8Bytes("manifest-001"));
  const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("merkle-root-001"));
  const grantBlobId = ethers.keccak256(ethers.toUtf8Bytes("grant-blob-001"));

  const batchId1 = ethers.keccak256(ethers.toUtf8Bytes("batch-001"));

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

    const DataFactory = await ethers.getContractFactory("DataRegistry");
    dataRegistry = await DataFactory.deploy(await identityRegistry.getAddress());
    await dataRegistry.waitForDeployment();
  });

  it("should register object and verify read permissions", async function () {
    await dataRegistry.registerObject(
      obj1Id,
      manifestId,
      merkleRoot,
      BigInt(1048576), // 1 MiB
      16,
      1, // Internal
      user1Id
    );

    // Owner can read
    expect(await dataRegistry.canRead(obj1Id, user1Id)).to.be.true;
    // Admin can read
    expect(await dataRegistry.canRead(obj1Id, adminId)).to.be.true;
    // Unrelated user cannot read
    expect(await dataRegistry.canRead(obj1Id, user2Id)).to.be.false;

    // Grant access to user2
    await dataRegistry.grantAccess(obj1Id, user2Id, grantBlobId, user1Id);
    expect(await dataRegistry.canRead(obj1Id, user2Id)).to.be.true;
    expect(await dataRegistry.getGrantBlob(obj1Id, user2Id)).to.equal(grantBlobId);

    // Revoke access
    await dataRegistry.revokeAccess(obj1Id, user2Id, user1Id);
    expect(await dataRegistry.canRead(obj1Id, user2Id)).to.be.false;
  });

  it("should support tombstone and prevent further read access", async function () {
    await dataRegistry.registerObject(obj1Id, manifestId, merkleRoot, BigInt(100), 1, 0, user1Id);
    expect(await dataRegistry.canRead(obj1Id, user1Id)).to.be.true;

    await dataRegistry.tombstone(obj1Id, user1Id);
    expect(await dataRegistry.canRead(obj1Id, user1Id)).to.be.false;

    // Further operations revert
    await expect(
      dataRegistry.grantAccess(obj1Id, user2Id, grantBlobId, user1Id)
    ).to.be.revertedWithCustomError(dataRegistry, "ObjectIsTombstoned");
  });

  it("should anchor telemetry batch and enforce anchor immutability", async function () {
    const devGroup = ethers.keccak256(ethers.toUtf8Bytes("esp32-group"));
    await dataRegistry.anchorBatch(
      batchId1,
      devGroup,
      merkleRoot,
      manifestId,
      100, // count
      BigInt(1760000000),
      BigInt(1760000030),
      adminId
    );

    expect(await dataRegistry.verifyAnchor(batchId1, merkleRoot)).to.be.true;
    expect(await dataRegistry.verifyAnchor(batchId1, ethers.ZeroHash)).to.be.false;

    // Re-anchoring existing batchId must revert (immutability rule)
    await expect(
      dataRegistry.anchorBatch(
        batchId1,
        devGroup,
        merkleRoot,
        manifestId,
        100,
        BigInt(1760000000),
        BigInt(1760000030),
        adminId
      )
    ).to.be.revertedWithCustomError(dataRegistry, "BatchAlreadyAnchored");
  });
});
