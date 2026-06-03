import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentIdentity", () => {
  it("mints one identity to the deployer and exposes agentId", async () => {
    const [owner] = await ethers.getSigners();
    const F = await ethers.getContractFactory("AgentIdentity");
    const id = await F.deploy("Cassandra", "The seer whose calls are provable");
    await id.waitForDeployment();
    expect(await id.ownerOf(1n)).to.equal(owner.address);
    expect(await id.agentName(1n)).to.equal("Cassandra");
    expect(await id.totalMinted()).to.equal(1n);
  });

  it("reverts a second mint", async () => {
    const F = await ethers.getContractFactory("AgentIdentity");
    const id = await F.deploy("Cassandra", "x");
    await id.waitForDeployment();
    await expect(id.mint()).to.be.revertedWith("already minted");
  });

  it("reverts on transfer attempts (soulbound)", async () => {
    const [owner, other] = await ethers.getSigners();
    const F = await ethers.getContractFactory("AgentIdentity");
    const id = await F.deploy("Cassandra", "x");
    await id.waitForDeployment();
    await expect(
      id.transferFrom(owner.address, other.address, 1n)
    ).to.be.revertedWith("soulbound: non-transferable");
  });
});
