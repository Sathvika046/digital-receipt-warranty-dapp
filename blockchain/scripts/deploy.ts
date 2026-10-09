
import { network } from "hardhat";

const { ethers } = await network.connect();

const warrantySystem = await ethers.deployContract("WarrantySystem");

await warrantySystem.waitForDeployment();

console.log(
  "WarrantySystem deployed to:",
  await warrantySystem.getAddress()
);