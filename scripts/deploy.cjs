const hre = require("hardhat");

async function main() {
  const AcademicCredentialRegistry = await hre.ethers.getContractFactory("AcademicCredentialRegistry");
  const registry = await AcademicCredentialRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`AcademicCredentialRegistry deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});