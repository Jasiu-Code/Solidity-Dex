// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "./Wallet.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Dex is Wallet {

    using SafeMath for uint;

    enum Side{
        BUY,
        SELL
    }

    struct Order{
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint filled;
        uint amount;
        uint price;
    }
    uint public nextOrderId = 0;

    mapping(bytes32=>mapping(uint => Order[])) OrderBook;

    function getOrderBook(bytes32 _ticker, Side _side) public view returns(Order[] memory orders){
        orders = OrderBook[_ticker][uint(_side)];
        return orders;
    } 

    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public{
        if(side == Side.BUY){
            require(balances[msg.sender][bytes32("ETH")] >= (amount.mul(price)), "Not enough ETH deposited"); 
        }
        else if(side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount, "Not enough tokens deposited");
        }
        Order[] storage orders = OrderBook[ticker][uint(side)];
        orders.push(Order(nextOrderId,msg.sender,side,ticker,0,amount,price));

        uint i = orders.length > 0 ? orders.length - 1 : 0;

        if(side == Side.BUY){
            for( i ; i > 0; i--){
                if(orders[i].price >orders[i-1].price){
                    Order memory orderToMove;
                    orderToMove = orders[i];
                    orders[i] = orders[i-1];
                    orders[i-1] = orderToMove;
                }
            }
            // while(i > 0){
            //     if(orders[i-1].price > orders[i].price){
            //         break;
            //     }
            //     Order memory orderToMove = orders[i-1];
            //     orders[i-1] = orders[i];
            //     orders[i] = orderToMove;
            //     i--;
            // }
        }
        else if(side == Side.SELL){
            //  while(i > 0){
            //     if(orders[i-1].price < orders[i].price){
            //         break;
            //     }
            //     Order memory orderToMove = orders[i-1];
            //     orders[i-1] = orders[i];
            //     orders[i] = orderToMove;
            //     i--;
            // }
            for( i ; i > 0 ; i--){
                if(orders[i].price < orders[i-1].price){
                    Order memory orderToMove;
                    orderToMove = orders[i];
                    orders[i] = orders[i-1];
                    orders[i-1] = orderToMove;
                } 
            }
        }
        nextOrderId++;
    }

    function createMarketOrder(Side side, bytes32 ticker, uint amount) public {
        if(side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount, "Not enough tokens for trade");
        }
        // uint orderbookSide;
        // side == Side.BUY ?  orderbookSide = 1: orderbookSide =0;
        Order[] storage orders = OrderBook[ticker][side == Side.BUY ? 1 : 0];
        uint totalFilled;
        uint amountToPay;
        for(uint i = 0; i<orders.length && totalFilled < amount; i++){
            // how much we can fill from order[i]
            uint trueAmount = orders[i].amount - orders[i].filled;
            // update total filled
            totalFilled = totalFilled.add(trueAmount);
        if(side == Side.BUY){
            // verify that the market order trader has neough eth to cover the purchase
            require(balances[msg.sender][bytes32("ETH")] >= amount.mul(orders[i].price));
            //execute the trade and shift the balances between buyer and seller
            balances[msg.sender][ticker] = balances[msg.sender][ticker].add(trueAmount);
            balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].sub(trueAmount.mul(orders[i].price));
            balances[orders[i].trader][ticker] = balances[orders[i].trader][ticker].sub(trueAmount);
            balances[orders[i].trader][bytes32("ETH")] = balances[orders[i].trader][bytes32("ETH")].add(trueAmount.mul(orders[i].price));
            // add amount to filled
            
        } 
        else if(side == Side.SELL){
            balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(trueAmount);
            balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].add(trueAmount.mul(orders[i].price));
            balances[orders[i].trader][ticker] = balances[orders[i].trader][ticker].add(trueAmount);
            balances[orders[i].trader][bytes32("ETH")] = balances[orders[i].trader][bytes32("ETH")].sub(trueAmount.mul(orders[i].price));
        }
        orders[i].filled = orders[i].filled.add(trueAmount);
        }
         //Remove 100% filled orders from the orderbook
        while(orders.length > 0 && orders[0].filled == orders[0].amount){
            //Remove the top element in the orders array by overwriting every element
            // with the next element in the order list
            for (uint256 i = 0; i < orders.length - 1; i++) {
                orders[i] = orders[i + 1];
            }
            orders.pop();
        }

        //  for(uint i = 0; i<orders.length; i++){
        //      if(orders[i].filled == orders[i].amount){
        //          Order memory orderToMove;
        //          orderToMove = orders[i+1];
        //          orders[i+1] = orders[i];
        //          orders[i] = orderToMove;
        //      }
        //  }


        

        //Loop through the orderbook and remove 100% filled orders
    }
}