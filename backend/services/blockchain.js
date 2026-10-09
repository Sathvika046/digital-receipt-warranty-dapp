const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(
  process.env.GANACHE_RPC_URL
);

const wallet = new ethers.Wallet(
  process.env.GANACHE_PRIVATE_KEY,
  provider
);

const contractABI = [
  "function registerWarranty(string,string,string,address,uint256,uint256) public returns (uint256)",
  "function nextWarrantyId() public view returns (uint256)",
  "function getWarranty(uint256) public view returns (uint256,string,string,string,address,address,uint256,uint256,bool)",
  "function getWarrantyBySerialNumber(string) public view returns (uint256,string,string,string,address,address,uint256,uint256,bool)",
  "function isWarrantyValid(uint256) public view returns (bool)",
  "function getRemainingWarrantyDays(uint256) public view returns (uint256)",
  "function warrantyExists(uint256) public view returns (bool)"
];

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractABI,
  wallet
);

module.exports = {
  provider,
  wallet,
  contract
};