const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("DEX tests", () => {
    let Link, link, Dex, dex, trader1, trader2, owner;
    
    beforeEach(async () => {
        Link = await ethers.getContractFactory("Link");
        link = await Link.deploy();
        await link.deployed();
        Dex = await ethers.getContractFactory("Dex");
        dex = await Dex.deploy();
        await dex.deployed();
        [owner, trader1, trader2] = await ethers.getSigners();
    })

    describe.skip("DEX Limit Order TEST", () => {
        it("Should check if user have enought ETH deposited to create buy order", async () =>{ 
            await expect(dex.createLimitOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),100,10))
            .to.be.revertedWith("Not enough ETH deposited")
            // dex.depositETH({value:1000});
            // await dex.createLimitOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),100,10);
            // expect(await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`), 0)[0].amount).to.equal(1000);
        })
        it("Should check if user have enough tokens deposited to create sell order", async () =>{
            await dex.addToken(ethers.utils.formatBytes32String(`${link.symbol()}`), link.address);  
            await expect(dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),100,10))
            .to.be.revertedWith("Not enough tokens deposited");
            await link.approve(dex.address, 1000);
            await dex.deposit(1000,ethers.utils.formatBytes32String(`${link.symbol()}`));
            // await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),100,10);
            // expect(await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`), 1)[0].amount).to.equal(1000);
        })
        it("Should sort BUY orderbook from highest price to lowest starting at index 0", async () =>{
            dex.depositETH({value:1000});
            await dex.createLimitOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),1,50);
            await dex.createLimitOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),1,20);
            await dex.createLimitOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),1,30);
            let orderbook = await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`),0);
            assert(orderbook.length > 0);
            for(let i = 0; i < orderbook.length-1; i++){
                assert(orderbook[i].price >= orderbook[i+1].price, "Not right order in buy order book")
            }

        })
        it("Should sort SELL orderbook from lowest price to highest starting at index 0", async () =>{
            await dex.addToken(ethers.utils.formatBytes32String(`${link.symbol()}`), link.address);
            await link.approve(dex.address, 1000);
            await dex.deposit(1000,ethers.utils.formatBytes32String(`${link.symbol()}`));

            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,13);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,15);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,11);
           
            let orderbook = await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`),1);
            assert(orderbook.length > 0);
            console.log("test");
            for(let i = 0; i < orderbook.length - 1; i++){
                assert(orderbook[i].price <= orderbook[i+1].price, "Not right order in Sell order book")
            }
        })
    })   
    
    describe("DEX Market Order TEST", () =>{

        beforeEach("AddToken to DEX, share tokens owner:700 trader1:300 trader2:0, approve  and deposit", async()=>{
            await dex.addToken(ethers.utils.formatBytes32String(`${link.symbol()}`), link.address);
            await dex.addToken(ethers.utils.formatBytes32String("ETH"), link.address);
            await link.transfer(trader1.address,300);
            await link.approve(dex.address, 1000);
            await link.connect(trader1).approve(dex.address, 1000);
            await link.connect(trader2).approve(dex.address, 1000);
            await dex.deposit(700,ethers.utils.formatBytes32String(`${link.symbol()}`));
            await dex.connect(trader1).deposit(300,ethers.utils.formatBytes32String(`${link.symbol()}`));
        })

        // function createMarketOrder(Side side, bytes32 ticker, uint amount) 
        ///////       1 
        it("Should check is seller have enough tokens for trade", async() => {
            let balance = await dex.balances(trader1.address, ethers.utils.formatBytes32String(`${link.symbol()}`));
            assert.equal(balance.toNumber(), 300, "Initial link balance is not 0");
            await expect(dex.connect(trader1).createMarketOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1000)).to.be.revertedWith("Not enough tokens");
            // await dex.createMarketOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),700);
        });
        //////        2
        it("Should check if buyer habe enough eth for trade", async() => {
            let balance = await dex.balances(trader1.address, ethers.utils.formatBytes32String("ETH"));
            assert.equal(balance.toNumber(), 0, "Initial ETH balance is not 0");
            await expect(dex.createMarketOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),700)).to.be.revertedWith("Not enough ETH");
        });
        //////        3
        it("Should check if market orders can be subimted even if order book is empty", async() => {
            await dex.depositETH({value:1000});
            let orderbook = await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`),0);
            assert(orderbook.length == 0, "Buy side is not empty");
            await dex.createMarketOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),700);
            let orderbook1 = await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`),0);
            assert(orderbook.length == 1, "Buy side is  empty");
        });
        //////        4
        it("Should check if market orders are filled until the order book is empty or the market order is 100% filled", async() => {
            // await dex.createMarketOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),700);
            // // jakos chwycic ten order i zobaczyc czy book jest pusty lub czy filled == amount
            // let orderbook = await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`),0);
            await dex.connect(trader2).depositETH({value: 1000});
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,200);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,100);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,300);
            let balanceBefore = await dex.balances(trader2.address, ethers.utils.formatBytes32String(`${link.symbol()}`));
            await dex.connect(trader2).createMarketOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),900);
            let balanceAfter =  await dex.balances(trader2.address, ethers.utils.formatBytes32String(`${link.symbol()}`));
            let orderbook = await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`),1);
            assert.equal(balanceBefore + 700, balanceAfter);
            assert(orderbook.length == 0, "Orderbook should be empty" )

            await dex.connect(trader2).depositETH({value:1000});
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,200);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,100);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,400);
            await dex.connect(trader2).createMarketOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),500);
            let orderbook1 = await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`),1);
            assert(orderbook1.length == 1, "Sell side should have only 1 order left");
            assert(orderbook1[0].filled == 0,"Sell side order should have 0 filled");
            // assume(orderbook == 0 || order[x].filled == order[x].amount);

        });
        //////        5
        it("Should change balance of eth for buyer", async() => {
            await dex.connect(trader2).depositETH({value:1000});
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,200);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,100);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,400);
            await dex.connect(trader2).createMarketOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),700);
            expect(await dex.balances(trader2.address,ethers.utils.formatBytes32String("ETH"))).to.equal(300);

        });
        //////        6
        it("Should change balance of tokens for sellers", async() => {
            await dex.connect(trader2).depositETH({value:1000});
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,200);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,100);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,400);
            await dex.connect(trader2).createMarketOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),700);
            expect(await dex.balances(owner.address,ethers.utils.formatBytes32String(`${link.symbol()}`))).to.equal(0);
        });
        //////        7
        it("Should filled limit orders should be removed from the order book", async() => {
            await dex.connect(trader2).depositETH({value:1000});
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,200);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,100);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),1,400);
            await dex.connect(trader2).createMarketOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),700);
            let orderbook = await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`),1);
            assert(orderbook.length == 0);
        
        });
        //////        8
        it("Limit orders filled property should be set correctly after trade", async () => {
            await dex.connect(trader2).depositETH({value:1000});
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),2,200);
            await dex.createLimitOrder(1,ethers.utils.formatBytes32String(`${link.symbol()}`),2,100);
            await dex.connect(trader2).createMarketOrder(0,ethers.utils.formatBytes32String(`${link.symbol()}`),3);
            let orderbook = await dex.getOrderBook(ethers.utils.formatBytes32String(`${link.symbol()}`),1);
            assert(orderbook[0].filled == 1);
        })
    })
})
