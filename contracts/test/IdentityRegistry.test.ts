import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IdentityRegistry Contract", function () {
  let identityRegistry: IdentityRegistry;
  let operator: SignerWithAddress;
  let nonOperator: SignerWithAddress;

  const adminId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:admin-001"));
  const managerId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:mgr-001"));
  const devId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:dev-001"));
  const userId = ethers.keccak256(ethers.toUtf8Bytes("did:snx:user-001"));

  const fp1 = ethers.keccak256(ethers.toUtf8Bytes("fingerprint-1"));
  const fp2 = ethers.keccak256(ethers.toUtf8Bytes("fingerprint-2"));
  const meta = ethers.keccak256(ethers.toUtf8Bytes("meta-hash"));

  const ROLE_ADMIN = 1;
  const ROLE_MANAGER = 2;
  const ROLE_AUDITOR = 4;
  const ROLE_USER = 8;
  const ROLE_DEVICE = 16;
  const ROLE_STORAGE_NODE = 32;

  beforeEach(async function () {
    [operator, nonOperator] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await Factory.deploy();
    await identityRegistry.waitForDeployment();

    // Bootstrap first Admin
    await identityRegistry.register(adminId, 0, ROLE_ADMIN, fp1, meta, adminId);
  });

  it("should enforce bootstrap registration and record admin count", async function () {
    const ident = await identityRegistry.get(adminId);
    expect(ident.roles).to.equal(ROLE_ADMIN);
    expect(ident.status).to.equal(0); // ACTIVE
    expect(await identityRegistry.activeAdminCount()).to.equal(1);
    expect(await identityRegistry.isActive(adminId)).to.be.true;
    expect(await identityRegistry.hasRole(adminId, ROLE_ADMIN)).to.be.true;
  });

  it("should allow Admin to register Manager, Device, and User", async function () {
    // Admin registers Manager
    await identityRegistry.register(managerId, 0, ROLE_MANAGER, fp1, meta, adminId);
    expect(await identityRegistry.hasRole(managerId, ROLE_MANAGER)).to.be.true;

    // Manager registers Device
    await identityRegistry.register(devId, 1, ROLE_DEVICE, fp1, meta, managerId);
    expect(await identityRegistry.hasRole(devId, ROLE_DEVICE)).to.be.true;

    // Non-Admin cannot register User
    await expect(
      identityRegistry.register(userId, 0, ROLE_USER, fp1, meta, managerId)
    ).to.be.revertedWithCustomError(identityRegistry, "UnauthorizedActor");
  });

  it("should prevent non-operator account from calling register", async function () {
    await expect(
      identityRegistry.connect(nonOperator).register(userId, 0, ROLE_USER, fp1, meta, adminId)
    ).to.be.revertedWithCustomError(identityRegistry, "CallerNotOperator");
  });

  it("should allow key rotation with new fingerprint", async function () {
    await identityRegistry.register(devId, 1, ROLE_DEVICE, fp1, meta, adminId);
    await identityRegistry.rotate(devId, fp2, devId);

    const ident = await identityRegistry.get(devId);
    expect(ident.certFingerprint).to.equal(fp2);
  });

  it("should support suspend and reinstate by Admin", async function () {
    await identityRegistry.register(userId, 0, ROLE_USER, fp1, meta, adminId);
    const reason = ethers.keccak256(ethers.toUtf8Bytes("maintenance"));

    await identityRegistry.suspend(userId, reason, adminId);
    expect(await identityRegistry.isActive(userId)).to.be.false;

    await identityRegistry.reinstate(userId, adminId);
    expect(await identityRegistry.isActive(userId)).to.be.true;
  });

  it("should enforce that REVOKED is terminal and cannot be reinstated", async function () {
    await identityRegistry.register(userId, 0, ROLE_USER, fp1, meta, adminId);
    const reason = ethers.keccak256(ethers.toUtf8Bytes("compromised"));

    await identityRegistry.revoke(userId, reason, adminId);
    const ident = await identityRegistry.get(userId);
    expect(ident.status).to.equal(2); // REVOKED

    // Reinstatement must revert
    await expect(
      identityRegistry.reinstate(userId, adminId)
    ).to.be.revertedWithCustomError(identityRegistry, "IdentityRevokedTerminal");

    // Setting roles on revoked identity must revert
    await expect(
      identityRegistry.setRoles(userId, ROLE_USER, adminId)
    ).to.be.revertedWithCustomError(identityRegistry, "IdentityRevokedTerminal");
  });

  it("should prevent demoting or revoking the last Admin", async function () {
    // Attempting to remove Admin role from the only Admin must revert
    await expect(
      identityRegistry.setRoles(adminId, ROLE_USER, adminId)
    ).to.be.revertedWithCustomError(identityRegistry, "CannotDemoteLastAdmin");

    // Attempting to revoke the only Admin must revert
    await expect(
      identityRegistry.revoke(adminId, ethers.ZeroHash, adminId)
    ).to.be.revertedWithCustomError(identityRegistry, "CannotDemoteLastAdmin");
  });
});
