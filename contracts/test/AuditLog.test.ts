import { expect } from "chai";
import { ethers } from "hardhat";
import { AuditLog } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AuditLog Contract", function () {
  let auditLog: AuditLog;
  let operator: SignerWithAddress;
  let nonOperator: SignerWithAddress;

  beforeEach(async function () {
    [operator, nonOperator] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AuditLog");
    auditLog = await Factory.deploy();
    await auditLog.waitForDeployment();
  });

  it("should initialize with head = 0 and seq = 0", async function () {
    expect(await auditLog.head()).to.equal(ethers.ZeroHash);
    expect(await auditLog.seq()).to.equal(0n);
  });

  it("should record events and match off-chain hash chain recomputation", async function () {
    const eventType1 = ethers.keccak256(ethers.toUtf8Bytes("DEVICE_REGISTERED"));
    const actor1 = ethers.keccak256(ethers.toUtf8Bytes("did:snx:admin-001"));
    const subject1 = ethers.keccak256(ethers.toUtf8Bytes("did:snx:dev-001"));
    const dataHash1 = ethers.keccak256(ethers.toUtf8Bytes("device-fp-001"));
    const corrId1 = ethers.keccak256(ethers.toUtf8Bytes("corr-001"));

    const tx1 = await auditLog.record(eventType1, actor1, subject1, dataHash1, corrId1);
    const receipt1 = await tx1.wait();
    const block1 = await ethers.provider.getBlock(receipt1!.blockNumber);

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const expectedHead1 = ethers.keccak256(
      abiCoder.encode(
        ["bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "uint256", "uint256"],
        [ethers.ZeroHash, eventType1, actor1, subject1, dataHash1, corrId1, block1!.timestamp, 1n]
      )
    );

    expect(await auditLog.seq()).to.equal(1n);
    expect(await auditLog.head()).to.equal(expectedHead1);

    // Second event chained to head1
    const eventType2 = ethers.keccak256(ethers.toUtf8Bytes("OBJECT_CREATED"));
    const subject2 = ethers.keccak256(ethers.toUtf8Bytes("obj-001"));
    const dataHash2 = ethers.keccak256(ethers.toUtf8Bytes("merkle-001"));
    const corrId2 = ethers.keccak256(ethers.toUtf8Bytes("corr-002"));

    const tx2 = await auditLog.record(eventType2, actor1, subject2, dataHash2, corrId2);
    const receipt2 = await tx2.wait();
    const block2 = await ethers.provider.getBlock(receipt2!.blockNumber);

    const expectedHead2 = ethers.keccak256(
      abiCoder.encode(
        ["bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "uint256", "uint256"],
        [expectedHead1, eventType2, actor1, subject2, dataHash2, corrId2, block2!.timestamp, 2n]
      )
    );

    expect(await auditLog.seq()).to.equal(2n);
    expect(await auditLog.head()).to.equal(expectedHead2);
  });

  it("should reject non-operator account", async function () {
    const eventType = ethers.keccak256(ethers.toUtf8Bytes("TEST"));
    await expect(
      auditLog.connect(nonOperator).record(eventType, ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash)
    ).to.be.revertedWithCustomError(auditLog, "CallerNotOperator");
  });
});
