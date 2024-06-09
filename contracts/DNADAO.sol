// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DNAERC20.sol";

contract DNADAO {
    DNAERC20 public token;
    uint256 public pricePerShare;
    bool public saleActive = true;

    struct Proposal {
        string title;
        string description;
        uint256 voteCountPro;
        uint256 voteCountCon;
        uint256 voteCountAbstain;
        bool executed;
        address recipient;
        uint256 amount;
    }

    mapping(address => uint256) public shares;
    Proposal[] public proposals;
    mapping(uint256 => mapping(address => bool)) public votes;
    mapping(address => address[]) public delegation;

    address public owner;

    constructor(address _tokenAddress, uint256 _pricePerShare) {
        token = DNAERC20(_tokenAddress);
        pricePerShare = _pricePerShare;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Sender must be the owner");
        _;
    }

    modifier onlyMembers() {
        require(shares[msg.sender] > 0, "Sender must be a member");
        _;
    }

    function endSale() external onlyOwner {
        require(saleActive, "Sale already inactive");
        saleActive = false;
    }

    function activeSale() external onlyOwner {
        require(!saleActive, "Sale already active");
        saleActive = true;
    }

    function buyShares(uint256 amount) external {
        require(saleActive, "Sale is closed");
        require(token.transferFrom(msg.sender, address(this), amount * pricePerShare), "Transfer failed");
        // require(token.transfer(address(this), amount * pricePerShare));
        shares[msg.sender] += amount;
        token.updateCurrentSupply(amount);
    }

    function delegateVote(address to) external onlyMembers{
        delegation[to].push(msg.sender);
    }

    function createProposal(
        string calldata title,
        string calldata description,
        address recipient,
        uint256 amount
    ) external onlyMembers {
        proposals.push(Proposal({
            title: title,
            description: description,
            voteCountPro: 0,
            voteCountCon: 0,
            voteCountAbstain: 0,
            executed: false,
            recipient: recipient,
            amount: amount
        }));
    }

    function vote(uint256 proposalId, bool support, bool abstain) external onlyMembers {
        address voter = msg.sender;
        uint256 totalDelegatedShares = shares[voter];

        require(!votes[proposalId][msg.sender], "Already voted");
        Proposal storage proposal = proposals[proposalId];

        // Controlla tutte le deleghe e somma le shares delegate
        for (uint256 i = 0; i < delegation[msg.sender].length; i++) {
            address delegate = delegation[msg.sender][i];
            if(!votes[proposalId][delegate]){
                totalDelegatedShares += shares[delegation[msg.sender][i]];
            }
        }

        if (abstain) {
            proposal.voteCountAbstain += totalDelegatedShares;
        } else if (support) {
            proposal.voteCountPro += totalDelegatedShares;
        } else {
            proposal.voteCountCon += totalDelegatedShares;
        }

        votes[proposalId][msg.sender] = true;
    }

    function executeProposal(uint256 proposalId) external onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Proposal already executed");

        uint256 totalVotes = proposal.voteCountPro + proposal.voteCountCon + proposal.voteCountAbstain;
        require(totalVotes > 0, "Not enoght votes");

        if (proposal.voteCountPro > proposal.voteCountCon) {
            proposal.executed = true;
            if (proposal.recipient != address(0) && proposal.amount > 0) {
                require(token.transfer(proposal.recipient, proposal.amount), "Token transfer failed");
            }
        }
    }

    function getProposals() external view returns (Proposal[] memory) {
        return proposals;
    }
}