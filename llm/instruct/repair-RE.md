# Repair Reentrancy (RE)

## 1. Check-Effects-Interactions Pattern

Always update state variables before making external calls.

```solidity
function withdraw(uint _amount) public {
    require(balances[msg.sender] >= _amount);

    // Effect
    balances[msg.sender] -= _amount;

    // Interaction
    (bool success, ) = msg.sender.call{value: _amount}("");
    require(success, "Transfer failed.");
}
```

## 2. Reentrancy Guards

Use a state variable to lock the contract, preventing reentrant calls.

```solidity
contract ReentrancyGuard {
    bool internal locked;

    modifier noReentrancy() {
        require(!locked, "No reentrancy");
        locked = true;
        _;
        locked = false;
    }
}

contract MyContract is ReentrancyGuard {
    function withdraw(uint _amount) public noReentrancy {
        require(balances[msg.sender] >= _amount);
        balances[msg.sender] -= _amount;

        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed.");
    }
}
```

## 3. Using ReentrancyGuard Library

Use OpenZeppelin `nonReentrant` for the contract function:

```solidity
// 引入OpenZeppelin的ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureBank is ReentrancyGuard {
    mapping(address => uint256) balances;

    // 通过nonReentrant修饰符防止reentrancy
    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Failed to send Ether");
    }
}
```
