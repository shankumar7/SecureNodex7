import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry, StorageNodeRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("StorageNodeRegistry Contract", function () {
  let identityRegistry: IdentityRegistry;
  let storageNodeRegistry: StorageNodeRegistry;
  let operator: SignerWithAddress;
  let nonOperator: SignerWithAddress;

  const adminId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:admin-001"));
  const nodeId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:node-pi1"));
  const userId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:user-001"));
  const fp = ethers.keccak256(ethers.toUtf8Bytes("node-fp-1"));

  const ROLE_ADMIN = 1;
  const ROLE_STORAGE_NODE = 32;

  beforeEach(async function () {
    [operator, nonOperator] = await ethers.getSigners();

    const IdFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdFactory.deploy();
    await identityRegistry.waitForDeployment();
    await identityRegistry.register(adminId, 0, ROLE_ADMIN, fp, ethers.ZeroHash, adminId);

    const StorageFactory = await ethers.getContractFactory("StorageNodeRegistry");
    storageNodeRegistry = await StorageFactory.deploy(await identityRegistry.getAddress());
    await storageNodeRegistry.waitForDeployment();
  });

  it("should allow Admin to register storage node if node identity has STORAGE_NODE role", async function () {
    // Register identity with STORAGE_NODE role
    await identityRegistry.register(nodeId, 2, ROLE_STORAGE_NODE, fp, ethers.ZeroHash, adminId);

    await storageNodeRegistry.addNode(
      nodeId,
      "https://storage-pi1.snx.lan:7443",
      BigInt(10 * 1024 * 1024 * 1024),
      fp,
      adminId
    );

    const node = await storageNodeRegistry.getNode(nodeId);
    expect(node.endpoint).to.equal("https://storage-pi1.snx.lan:7443");
    expect(node.status).to.equal(0); // ACTIVE

    const list = await storageNodeRegistry.listNodes();
    expect(list.length).to.equal(1);
    expect(list[0].id).to.equal(nodeId);
  });

  it("should reject adding node without STORAGE_NODE identity", async function () {
    // Register user without STORAGE_NODE role
    await identityRegistry.register(userId, 0, 8, fp, ethers.ZeroHash, adminId);

    await expect(
      storageNodeRegistry.addNode(
        userId,
        "https://node.lan:7443",
        BigInt(1000),
        fp,
        adminId
      )
    ).to.be.revertedWithCustomError(storageNodeRegistry, "NodeNotRegisteredInIdentity");
  });

  it("should allow Admin to update endpoint, capacity, and status", async function () {
    await identityRegistry.register(nodeId, 2, ROLE_STORAGE_NODE, fp, ethers.ZeroHash, adminId);
    await storageNodeRegistry.addNode(nodeId, "https://old.lan:7443", BigInt(1000), fp, adminId);

    await storageNodeRegistry.updateNode(nodeId, "https://new.lan:7443", BigInt(2000), adminId);
    let node = await storageNodeRegistry.getNode(nodeId);
    expect(node.endpoint).to.equal("https://new.lan:7443");
    expect(node.capacityBytes).to.equal(BigInt(2000));

    await storageNodeRegistry.setNodeStatus(nodeId, 1, adminId); // SUSPENDED
    node = await storageNodeRegistry.getNode(nodeId);
    expect(node.status).to.equal(1);
  });
});
