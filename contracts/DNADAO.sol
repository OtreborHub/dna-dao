// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DNAERC20.sol";

contract DNADAO {

    struct Proposal {
        address proposalAddr;
        string title;
        string description;
        uint256 voteCountPro;
        uint256 voteCountCon;
        uint256 voteCountAbstain;
        bool executed;
        bool approved;
        address recipient;
        uint256 amount;
    }

    DNAERC20 public token;
    Proposal[] public proposals;
    mapping(address => uint256) public shares;
    mapping(uint256 => mapping(address => bool)) public votes;
    mapping(address => address[]) public delegation;
    address public owner;
    uint256 public pricePerShare;
    bool public saleEnabled = true;

    event BuyOrder(address buyer, uint256 amount);
    event SaleState(bool enabled);
    event DelegationState(address to, bool addedRemoved);
    event ProposalState(string title, bool created, bool approved);
    event Vote(address member);

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

    function isMember() external view returns(bool) {
        return(shares[msg.sender] > 0);
    }

    function getProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    function isEmpty(string calldata s1) private pure returns(bool) {
        return keccak256(abi.encode(s1)) == keccak256(abi.encode(""));
    }

    function generateAddress(string memory value) private pure returns(address){
        return address(uint160(uint256(keccak256(abi.encodePacked(value)))));
    }

    function searchProposal(address proposalAddr) public view returns(uint256, Proposal memory) {
        for(uint i = 0; i < proposals.length; i++){
            if(proposals[i].proposalAddr == proposalAddr){
                return (i, proposals[i]);
            }
        }

        revert("Proposal not found");
    }

    function disableSale() external onlyOwner {
        require(saleEnabled, "Sale already disabled");
        saleEnabled = false;
        emit SaleState(saleEnabled);
    }

    function enableSale() external onlyOwner {
        require(!saleEnabled, "Sale already enabled");
        saleEnabled = true;
        emit SaleState(saleEnabled);
    }

    function buyShares(uint256 amount) external {
        require(saleEnabled, "Sale is closed");
        require(msg.sender != owner, "Sender can't be the owner");
        require(token.transferFrom(msg.sender, address(this), amount * pricePerShare), "Transfer failed");
        shares[msg.sender] += amount;
        emit BuyOrder(msg.sender, amount);
    }

    function delegateMember(address member) external onlyMembers{
        require(shares[member] > 0, "Address not owned by a member");
        delegation[member].push(msg.sender);
        emit DelegationState(member, true);
    }

    function revokeDelegation(address member) external onlyMembers {
        require(shares[member] > 0, "Address not owned by a member");
        address[] storage delegators = delegation[member];
        bool found = false;

        for (uint256 i = 0; i < delegators.length; i++) {
            if (delegators[i] == msg.sender) {
                found = true;
                delegators[i] = delegators[delegators.length - 1];
                delegators.pop();
                break;
            }
        }

        require(found, "Delegation not found");
        emit DelegationState(member, false);
    }

    function createProposal(
        string calldata title,
        string calldata description,
        address recipient,
        uint256 amount
    ) external onlyMembers returns(address) {
        require(!isEmpty(title), "Empty title");
        require(!isEmpty(description), "Empty description");
        address proposalAddr = generateAddress(string.concat(title, description));
        proposals.push(Proposal({
            proposalAddr: proposalAddr,
            title: title,
            description: description,
            voteCountPro: 0,
            voteCountCon: 0,
            voteCountAbstain: 0,
            executed: false,
            approved: false,
            recipient: recipient,
            amount: amount
        }));
        emit ProposalState(title, true, false);
        return proposalAddr;
    }

    function voteProposal(address proposalAddr, bool support, bool abstain) external onlyMembers {
        address voter = msg.sender;
        uint256 totalDelegatedShares = shares[voter];

        (uint256 proposalId, ) = searchProposal(proposalAddr);
        require(!votes[proposalId][msg.sender], "Already voted");
        Proposal storage proposal = proposals[proposalId];

        // Controlla tutte le deleghe e somma le shares delegate
        for (uint256 i = 0; i < delegation[msg.sender].length; i++) {
            address delegate = delegation[msg.sender][i];
            if(!votes[proposalId][delegate]){
                votes[proposalId][delegate] = true;
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
        emit Vote(msg.sender);
    }

    function executeProposal(address proposalAddr) external onlyOwner {
        (uint256 proposalId, ) = searchProposal(proposalAddr);
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Proposal already executed");

        uint256 totalVotes = proposal.voteCountPro + proposal.voteCountCon + proposal.voteCountAbstain;
        require(totalVotes > 0, "Not enoght votes");

        proposal.executed = true;
        if (proposal.voteCountPro > proposal.voteCountCon) {
            proposal.approved = true;
            if (proposal.recipient != address(0) && proposal.amount > 0) {
                require(token.transfer(proposal.recipient, proposal.amount), "Token transfer failed");
            }
        }
        emit ProposalState(proposal.title, false, proposal.approved);
    }


}