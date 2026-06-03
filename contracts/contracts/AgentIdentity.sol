// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal ERC-8004-style agent identity. One soulbound-ish identity NFT
/// per agent; the token id is the on-chain reputation anchor referenced by
/// SignalRegistry. (If a vetted ERC-8004 reference impl is available at build
/// time, swap this for it; the interface SignalRegistry needs is just ownerOf.)
contract AgentIdentity is ERC721, Ownable {
    uint256 public totalMinted;
    mapping(uint256 => string) public agentName;
    mapping(uint256 => string) public agentBio;

    constructor(string memory name_, string memory bio_)
        ERC721("Cassandra Agent Identity", "CASS-ID")
        Ownable(msg.sender)
    {
        _mintTo(msg.sender, name_, bio_);
    }

    function mint() external onlyOwner {
        require(totalMinted == 0, "already minted");
        _mintTo(msg.sender, "Cassandra", "");
    }

    function _mintTo(address to, string memory name_, string memory bio_) internal {
        uint256 id = ++totalMinted;
        _safeMint(to, id);
        agentName[id] = name_;
        agentBio[id] = bio_;
    }

    /// @notice Soulbound: identity cannot be transferred once minted. Submit
    /// rights are permanently bound to the deployer-controlled address.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0), "soulbound: non-transferable");
        return super._update(to, tokenId, auth);
    }
}
