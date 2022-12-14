// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract Wallet is Ownable{

    using SafeMath for uint;

    struct Token{
        bytes32 ticker;
        address tokenAddress;
    }

    bytes32[] public tokenList;

    mapping(bytes32=>Token) public tokenMapping;

    mapping(address=>mapping(bytes32=>uint)) public balances;

    modifier tokenExist(bytes32 ticker){
        require(tokenMapping[ticker].tokenAddress != address(0),"Token does not exist");
        _;
    }

    function addToken(bytes32 ticker, address tokenAddress) onlyOwner external {
        tokenMapping[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }
    
    function deposit(uint amount, bytes32 ticker) external tokenExist(ticker){
        // require(IERC20(tokenMapping[ticker].tokenAddress).balanceOf(msg.sender) >= amount);
        IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);
    }   

    function withdraw(uint amount, bytes32 ticker) external tokenExist(ticker){
        require(balances[msg.sender][ticker] >= amount, "Balance is not sufficient");
        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount); 
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);
    }

    function depositETH() payable external{
        balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].add(msg.value);
    }
    function withdrawETH(uint amount) external{
        require(balances[msg.sender][bytes32("ETH")] >= amount, "Not enough balance");
        balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].sub(amount);
        msg.sender.call{value:amount}("");
    }

}