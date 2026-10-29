import { expect } from "chai";
import { ethers } from "hardhat";
import {
  IdentityRegistry,
  StorageNodeRegistry,
  AssetRegistry,
  DataRegistry,
  AuditLog,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Role Matrix & Fuzzing Suite", function () {
  let identityRegistry: IdentityRegistry;
  let storageRegistry: StorageNodeRegistry;
  let assetRegistry: AssetRegistry;
  let dataRegistry: DataRegistry;
  let auditLog: AuditLog;

  let operator: SignerWithAddress;
  let nonOperator: SignerWithAddress;

  const adminId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:admin-001"));
  const managerId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:manager-001"));
  const auditorId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:auditor-001"));
  const userId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:user-001"));
  const deviceId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:device-001"));
  const nodeIdentId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:storage-001"));

  const fp = ethers.keccak256(ethers.toUtf8Bytes("fp"));

  const ROLE_ADMIN = 1;
  const ROLE_MANAGER = 2;
  const ROLE_AUDITOR = 4;
  const ROLE_USER = 8;
  const ROLE_DEVICE = 16;
  const ROLE_STORAGE_NODE = 32;

  beforeEach(async function () {
    [operator, nonOperator] = await ethers.getSigners();

    const IdFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdFactory.deploy();
    await identityRegistry.waitForDeployment();
    const idAddress = await identityRegistry.getAddress();

    // Register test principals
    await identityRegistry.register(adminId, 0, ROLE_ADMIN, fp, ethers.ZeroHash, adminId);
    await identityRegistry.register(managerId, 0, ROLE_MANAGER, fp, ethers.ZeroHash, adminId);
    await identityRegistry.register(auditorId, 0, ROLE_AUDITOR, fp, ethers.ZeroHash, adminId);
    await identityRegistry.register(userId, 0, ROLE_USER, fp, ethers.ZeroHash, adminId);
    await identityRegistry.register(deviceId, 1, ROLE_DEVICE, fp, ethers.ZeroHash, adminId);
    await identityRegistry.register(nodeIdentId, 2, ROLE_STORAGE_NODE, fp, ethers.ZeroHash, adminId);

    const StorageFactory = await ethers.getContractFactory("StorageNodeRegistry");
    storageRegistry = await StorageFactory.deploy(idAddress);
    await storageRegistry.waitForDeployment();

    const AssetFactory = await ethers.getContractFactory("AssetRegistry");
    assetRegistry = await AssetFactory.deploy(idAddress);
    await assetRegistry.waitForDeployment();

    const DataFactory = await ethers.getContractFactory("DataRegistry");
    dataRegistry = await DataFactory.deploy(idAddress);
    await dataRegistry.waitForDeployment();

    const AuditFactory = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditFactory.deploy();
    await auditLog.waitForDeployment();
  });

  describe("Table-Driven Role Matrix Checks", function () {
    it("Auditor cannot register identities, add nodes, or mint assets", async function () {
      const newId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:new-001"));

      // Auditor cannot register identity
      await expect(
        identityRegistry.register(newId, 0, ROLE_USER, fp, ethers.ZeroHash, auditorId)
      ).to.be.revertedWithCustomError(identityRegistry, "UnauthorizedActor");

      // Auditor cannot add storage node
      await expect(
        storageRegistry.addNode(newId, "https://node.lan", 1000n, fp, auditorId)
      ).to.be.revertedWithCustomError(storageRegistry, "UnauthorizedActor");

      // Auditor cannot mint asset
      await expect(
        assetRegistry.mintAsset(newId, 0, userId, ethers.ZeroHash, auditorId)
      ).to.be.revertedWithCustomError(assetRegistry, "UnauthorizedActor");
    });

    it("Manager can register Device but cannot register User or Admin", async function () {
      const newDevId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:dev-new"));
      const newUserId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:user-new"));
      const newAdminId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:admin-new"));

      // Manager CAN register Device
      await identityRegistry.register(newDevId, 1, ROLE_DEVICE, fp, ethers.ZeroHash, managerId);
      expect(await identityRegistry.getFunction("hasRole(bytes32,uint32)")(newDevId, ROLE_DEVICE)).to.be.true;

      // Manager CANNOT register User
      await expect(
        identityRegistry.register(newUserId, 0, ROLE_USER, fp, ethers.ZeroHash, managerId)
      ).to.be.revertedWithCustomError(identityRegistry, "UnauthorizedActor");

      // Manager CANNOT register Admin
      await expect(
        identityRegistry.register(newAdminId, 0, ROLE_ADMIN, fp, ethers.ZeroHash, managerId)
      ).to.be.revertedWithCustomError(identityRegistry, "UnauthorizedActor");
    });

    it("User cannot add nodes or grant admin roles", async function () {
      const targetId = ethers.keccak256(ethers.toUtf8Bytes("target"));
      await expect(
        identityRegistry.setRoles(targetId, ROLE_ADMIN, userId)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityNotFound");
    });
  });

  describe("Fuzz Testing Role Escalation Invariants", function () {
    it("Random role bitmasks without ADMIN bit (bit 0) never escalate to ADMIN operations", async function () {
      for (let i = 0; i < 50; i++) {
        // Generate random 32-bit integer with bit 0 (ADMIN) cleared
        const randomRoles = (Math.floor(Math.random() * 0xffffffff) & ~ROLE_ADMIN) >>> 0;
        const fuzzPrincipalId = ethers.keccak256(ethers.toUtf8Bytes(`fuzz-principal-${i}`));

        // Register principal with random non-admin roles
        await identityRegistry.register(fuzzPrincipalId, 0, randomRoles, fp, ethers.ZeroHash, adminId);

        // Principal must not have ADMIN role
        expect(await identityRegistry.getFunction("hasRole(bytes32,uint32)")(fuzzPrincipalId, ROLE_ADMIN)).to.be.false;

        // Attempt Admin-only operation: add node to StorageNodeRegistry
        const testNodeId = ethers.keccak256(ethers.toUtf8Bytes(`node-${i}`));
        await expect(
          storageRegistry.addNode(testNodeId, "https://fuzz.lan", 1000n, fp, fuzzPrincipalId)
        ).to.be.revertedWithCustomError(storageRegistry, "UnauthorizedActor");
      }
    });
  });
});
