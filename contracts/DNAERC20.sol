// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DNAERC20 is ERC20 {
    uint256 public tokenPrice;
    address private owner;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 _tokenPrice
    ) ERC20(name, symbol) {
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
        tokenPrice = _tokenPrice;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Sender must be the owner");
        _;
    }

    function currentSupply() public view returns (uint256){
        return balanceOf(owner);
    }

    function buyDNA() public payable {
        require(msg.value > 0, "Insufficient value sent");

        uint256 tokensToBuy = msg.value / tokenPrice;
        require(tokensToBuy <= balanceOf(owner), "Non ci sono abbastanza token disponibili");

        _transfer(owner, msg.sender, tokensToBuy);
    }

    function updateTokenPrice(uint256 newPrice) public onlyOwner {
        tokenPrice = newPrice;
    }
}