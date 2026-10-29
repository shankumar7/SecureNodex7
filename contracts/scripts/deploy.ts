import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`[+] Deploying SecureNodeX contracts with account: ${deployer.address}`);
  console.log(`[+] Network: ${network.name} (Chain ID: ${network.config.chainId})`);

  // 1. Deploy IdentityRegistry
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityAddress = await identityRegistry.getAddress();
  console.log(`[+] IdentityRegistry deployed to: ${identityAddress}`);

  // 2. Deploy StorageNodeRegistry
  const StorageNodeRegistry = await ethers.getContractFactory("StorageNodeRegistry");
  const storageNodeRegistry = await StorageNodeRegistry.deploy(identityAddress);
  await storageNodeRegistry.waitForDeployment();
  const storageNodeAddress = await storageNodeRegistry.getAddress();
  console.log(`[+] StorageNodeRegistry deployed to: ${storageNodeAddress}`);

  // 3. Deploy AssetRegistry
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.deploy(identityAddress);
  await assetRegistry.waitForDeployment();
  const assetAddress = await assetRegistry.getAddress();
  console.log(`[+] AssetRegistry deployed to: ${assetAddress}`);

  // 4. Deploy DataRegistry
  const DataRegistry = await ethers.getContractFactory("DataRegistry");
  const dataRegistry = await DataRegistry.deploy(identityAddress);
  await dataRegistry.waitForDeployment();
  const dataAddress = await dataRegistry.getAddress();
  console.log(`[+] DataRegistry deployed to: ${dataAddress}`);

  // 5. Deploy AuditLog
  const AuditLog = await ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy();
  await auditLog.waitForDeployment();
  const auditAddress = await auditLog.getAddress();
  console.log(`[+] AuditLog deployed to: ${auditAddress}`);

  // Bootstrap Admin Principal: did:snx:00000000000000000000000000000001
  const bootstrapAdminDid = "did:snx:00000000000000000000000000000001";
  const bootstrapAdminId = ethers.keccak256(ethers.toUtf8Bytes(bootstrapAdminDid));
  const dummyFp = ethers.keccak256(ethers.toUtf8Bytes("bootstrap-admin-fp"));
  const dummyMeta = ethers.keccak256(ethers.toUtf8Bytes("bootstrap-meta"));

  // Register bootstrap admin in IdentityRegistry (ADMIN role = 1)
  console.log(`[+] Registering bootstrap Admin principal (${bootstrapAdminDid})...`);
  const tx = await identityRegistry.register(
    bootstrapAdminId,
    0, // Kind.USER
    1, // ROLE_ADMIN = 1
    dummyFp,
    dummyMeta,
    bootstrapAdminId
  );
  await tx.wait();
  console.log(`[+] Bootstrap Admin registered.`);

  // Write deployment manifest to deployments/<network>.json
  const deploymentsDir = path.join(__dirname, "../../deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      IdentityRegistry: identityAddress,
      StorageNodeRegistry: storageNodeAddress,
      AssetRegistry: assetAddress,
      DataRegistry: dataAddress,
      AuditLog: auditAddress,
    },
    bootstrapAdmin: {
      did: bootstrapAdminDid,
      principalId: bootstrapAdminId,
    },
  };

  const deploymentFilePath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentData, null, 2));
  console.log(`[+] Deployment manifest written to: ${deploymentFilePath}`);

  // Export ABIs to backend/app/chain/abi/
  const backendAbiDir = path.join(__dirname, "../../backend/app/chain/abi");
  fs.mkdirSync(backendAbiDir, { recursive: true });

  const contractNames = [
    "IdentityRegistry",
    "StorageNodeRegistry",
    "AssetRegistry",
    "DataRegistry",
    "AuditLog",
  ];

  for (const name of contractNames) {
    const artifactPath = path.join(
      __dirname,
      `../artifacts/contracts/${name}.sol/${name}.json`
    );
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      const abiOut = path.join(backendAbiDir, `${name}.json`);
      fs.writeFileSync(abiOut, JSON.stringify(artifact.abi, null, 2));
      console.log(`[+] Exported ABI for ${name} -> ${abiOut}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
