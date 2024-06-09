// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DNAERC20 is ERC20 {
    uint256 public currentSupply;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
        currentSupply = initialSupply;
    }

    function updateCurrentSupply(uint amount) public {
        currentSupply -= amount;
    }
}