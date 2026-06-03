import { ethers, network } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";

async function main() {
  const Id = await ethers.getContractFactory("AgentIdentity");
  const id = await Id.deploy("Cassandra", "The seer whose calls are provable");
  await id.waitForDeployment();

  const Reg = await ethers.getContractFactory("SignalRegistry");
  const reg = await Reg.deploy(await id.getAddress(), 1n);
  await reg.waitForDeployment();

  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    agentIdentity: await id.getAddress(),
    signalRegistry: await reg.getAddress(),
    agentId: 1,
  };
  mkdirSync("deployments", { recursive: true });
  writeFileSync(`deployments/${network.name}.json`, JSON.stringify(out, null, 2));
  console.log("Deployed:", out);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
