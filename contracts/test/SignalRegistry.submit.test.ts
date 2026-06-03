import { expect } from "chai";
import { ethers } from "hardhat";

async function deploy() {
  const [agent, stranger] = await ethers.getSigners();
  const Id = await ethers.getContractFactory("AgentIdentity");
  const id = await Id.deploy("Cassandra", "x");
  await id.waitForDeployment();
  const Reg = await ethers.getContractFactory("SignalRegistry");
  const reg = await Reg.deploy(await id.getAddress(), 1n); // agentId = 1
  await reg.waitForDeployment();
  return { agent, stranger, reg };
}

const ev = ethers.keccak256(ethers.toUtf8Bytes("evidence-json"));

describe("SignalRegistry.submit", () => {
  it("stores a pending signal from the agent-identity owner", async () => {
    const { reg } = await deploy();
    await reg.submit("whale_flow:0xabc:100", 0, ethers.getAddress("0x000000000000000000000000000000000000abcd"), 1, 87, ev);
    const s = await reg.getSignal("whale_flow:0xabc:100");
    expect(s.status).to.equal(0); // pending
    expect(s.score).to.equal(87);
    expect(s.evidenceHash).to.equal(ev);
    expect(await reg.totalSignals()).to.equal(1n);
  });

  it("reverts submit from a non-identity-owner", async () => {
    const { reg, stranger } = await deploy();
    await expect(
      reg.connect(stranger).submit("x:0x:1", 0, ethers.ZeroAddress, 1, 50, ev)
    ).to.be.revertedWith("not agent");
  });

  it("reverts duplicate signal id", async () => {
    const { reg } = await deploy();
    await reg.submit("dup:1", 0, ethers.ZeroAddress, 1, 50, ev);
    await expect(reg.submit("dup:1", 0, ethers.ZeroAddress, 1, 50, ev)).to.be.revertedWith("exists");
  });

  it("reverts when score exceeds 100", async () => {
    const { reg } = await deploy();
    await expect(reg.submit("s:1", 0, ethers.ZeroAddress, 0, 101, ev)).to.be.revertedWith("score>100");
  });

  it("reverts setResolver from a non-deployer", async () => {
    const { reg, stranger } = await deploy();
    await expect(reg.connect(stranger).setResolver(stranger.address)).to.be.revertedWith("not deployer");
  });
});
