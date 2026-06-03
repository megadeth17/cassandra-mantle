import { expect } from "chai";
import { ethers } from "hardhat";

async function deploy() {
  const [agent] = await ethers.getSigners();
  const Id = await ethers.getContractFactory("AgentIdentity");
  const id = await Id.deploy("Cassandra", "x"); await id.waitForDeployment();
  const Reg = await ethers.getContractFactory("SignalRegistry");
  const reg = await Reg.deploy(await id.getAddress(), 1n); await reg.waitForDeployment();
  return { agent, reg };
}
const ev = ethers.keccak256(ethers.toUtf8Bytes("e"));

describe("SignalRegistry.resolve", () => {
  it("resolves a pending signal to hit and bumps the hit counter", async () => {
    const { reg } = await deploy();
    await reg.submit("a", 0, ethers.ZeroAddress, 1, 90, ev);
    await reg.resolve("a", 1); // Hit
    expect((await reg.getSignal("a")).status).to.equal(1);
    expect(await reg.hits()).to.equal(1n);
  });

  it("reverts a second resolve", async () => {
    const { reg } = await deploy();
    await reg.submit("a", 0, ethers.ZeroAddress, 1, 90, ev);
    await reg.resolve("a", 1);
    await expect(reg.resolve("a", 2)).to.be.revertedWith("already resolved");
  });

  it("reverts resolve from a non-resolver", async () => {
    const { reg } = await deploy();
    const [, other] = await ethers.getSigners();
    await reg.submit("a", 0, ethers.ZeroAddress, 1, 90, ev);
    await expect(reg.connect(other).resolve("a", 1)).to.be.revertedWith("not resolver");
  });
});
