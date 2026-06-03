// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @notice Immutable ledger of Cassandra's calls. submit() is gated on the
/// caller owning the Cassandra ERC-8004 identity. resolve() closes a pending
/// call exactly once. Records are append-only; status only moves pending->final.
contract SignalRegistry {
    enum Status { Pending, Hit, Miss }
    enum Direction { Bullish, Bearish, Neutral }

    // --- storage ---
    IERC721 public immutable identity;
    uint256 public immutable agentId;
    address public resolver; // set once by deployer (the agent)
    address public immutable deployer;

    struct Record {
        string id;
        uint8 signalType;     // maps to shared SignalType enum index
        address subject;
        Direction direction;
        uint16 score;         // 0..100
        bytes32 evidenceHash;
        uint64 submittedAt;
        uint64 resolvedAt;
        Status status;
        bool exists;
    }

    mapping(string => Record) private records;
    string[] public ids;
    uint256 public totalSignals;
    uint256 public hits;
    uint256 public misses;

    event SignalSubmitted(string indexed idKey, string id, uint8 signalType, address subject, uint8 direction, uint16 score, bytes32 evidenceHash, uint64 ts);
    event SignalResolved(string indexed idKey, string id, uint8 status, uint64 ts);

    modifier onlyAgent() {
        require(identity.ownerOf(agentId) == msg.sender, "not agent");
        _;
    }

    constructor(address identity_, uint256 agentId_) {
        identity = IERC721(identity_);
        agentId = agentId_;
        deployer = msg.sender;
        resolver = msg.sender;
    }

    function setResolver(address r) external {
        require(msg.sender == deployer, "not deployer");
        resolver = r;
    }

    function submit(
        string calldata id,
        uint8 signalType,
        address subject,
        uint8 direction,
        uint16 score,
        bytes32 evidenceHash
    ) external onlyAgent {
        require(!records[id].exists, "exists");
        require(score <= 100, "score>100");
        records[id] = Record({
            id: id,
            signalType: signalType,
            subject: subject,
            direction: Direction(direction),
            score: score,
            evidenceHash: evidenceHash,
            submittedAt: uint64(block.timestamp),
            resolvedAt: 0,
            status: Status.Pending,
            exists: true
        });
        ids.push(id);
        totalSignals++;
        emit SignalSubmitted(id, id, signalType, subject, direction, score, evidenceHash, uint64(block.timestamp));
    }

    function resolve(string calldata id, uint8 outcome) external {
        require(msg.sender == resolver, "not resolver");
        Record storage r = records[id];
        require(r.exists, "no signal");
        require(r.status == Status.Pending, "already resolved");
        require(outcome == uint8(Status.Hit) || outcome == uint8(Status.Miss), "bad outcome");
        r.status = Status(outcome);
        r.resolvedAt = uint64(block.timestamp);
        if (r.status == Status.Hit) hits++; else misses++;
        emit SignalResolved(id, id, outcome, uint64(block.timestamp));
    }

    function getSignal(string calldata id) external view returns (Record memory) {
        return records[id];
    }

    function idsCount() external view returns (uint256) { return ids.length; }
}
