import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const PK = process.env.DEPLOYER_PK ?? "";

const config: HardhatUserConfig = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" } },
  networks: {
    mantleSepolia: {
      url: process.env.MANTLE_RPC ?? "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts: PK ? [PK] : [],
    },
  },
};
export default config;
