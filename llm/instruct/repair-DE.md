# Repair Dangerous `delegatecall` (DE)

To fix DE, ensure that only the contract owner or authorized accounts can invoke functions that use `delegatecall`.

## Manually writing `onlyOwner` method: (First choice)

```solidity
pragma solidity ^0.8.0;

contract SafeDelegatecall {
    address private owner;
    event DelegatecallExecuted(address target, bytes data);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function safeDelegatecall(address target, bytes memory data) public onlyOwner returns (bytes memory) {
        require(target != address(0), "Invalid target address");

        (bool success, bytes memory result) = target.delegatecall(data);
        require(success, "Delegatecall failed");

        emit DelegatecallExecuted(target, data);

        return result;
    }
}
```

## Using OpenZeppelin's Ownable functionality:

```solidity
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SafeDelegatecall is Ownable {
    event DelegatecallExecuted(address target, bytes data);

    function safeDelegatecall(address target, bytes memory data) public onlyOwner returns (bytes memory) {
        require(target != address(0), "Invalid target address");

        (bool success, bytes memory result) = target.delegatecall(data);
        require(success, "Delegatecall failed");

        emit DelegatecallExecuted(target, data);

        return result;
    }
}
```
