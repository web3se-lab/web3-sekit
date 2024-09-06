# Repair Reentrancy (RE)

## 1. Check-Effects-Interactions Pattern

Always update state variables before making external calls.

```solidity
function withdraw(uint _amount) public {
    require(balances[msg.sender] >= _amount);

    // Modify state first
    balances[msg.sender] -= _amount;

    // Then interact with external
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

## 3. Reordering Calls

Ensure all state changes are completed before making external calls.

```solidity
function safeWithdraw() public noReentrancy {
    uint amount = balances[msg.sender];

    require(amount > 0, "Insufficient balance");

    balances[msg.sender] = 0;

    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed.");
}
```

## 4. Using `transfer` or `send`

These methods limit the gas available for the called contract, preventing extensive computations in the callback.

```solidity
function withdraw(uint _amount) public {
    require(balances[msg.sender] >= _amount);
    balances[msg.sender] -= _amount;
    msg.sender.transfer(_amount);
}
```
