const { expect } = require("chai");
const { ethers } = require("hardhat");

describe.skip("Wallet tests", () => {
    let Wallet, wallet, Link, link, Dex, dex, trader1, trader2;

    beforeEach(async () => {
         Wallet = await ethers.getContractFactory("Wallet");
         wallet = await Wallet.deploy();
        await wallet.deployed();
        Link = await ethers.getContractFactory("Link");
        link = await Link.deploy();
        await link.deployed();
        Dex = await ethers.getContractFactory("Dex");
        dex = await Dex.deploy();
        await dex.deployed();
        [owner, trader1, trader2] = await ethers.getSigners();
    })
    describe("Wallet add token",()=>{

        it("Should deploy link contract correctly", async ()=> {
            expect(await link.name()).to.equal("ChainLink");
            expect(await link.balanceOf(owner.address)).to.equal(1000);
        })

        it("Should add token correctly", async () => {
            await wallet.addToken(ethers.utils.formatBytes32String(`${link.symbol()}`), link.address);
            expect(await wallet.tokenList(0)).to.equal(ethers.utils.formatBytes32String(`${link.symbol()}`));
        })
        it("Shoulde be only possible for owner to add tokens", async () => {
            await expect(wallet.connect(trader1).addToken(ethers.utils.formatBytes32String("LINK"), link.address))
            .to.be.reverted;
        })

        it("Should handle token transfer correctly", async ()=> {  
            await link.transfer(trader1.address, 500);
            expect (await link.balanceOf(trader1.address)).to.equal(500);
              })
        it("Should handle deposit correctly", async ()=> {   
            await wallet.addToken(ethers.utils.formatBytes32String(`${link.symbol()}`), link.address);  
            await link.transfer(trader1.address, 500);
            await link.connect(trader1).approve(wallet.address,500);
            await wallet.connect(trader1).deposit(300,ethers.utils.formatBytes32String(`${link.symbol()}`));
            expect(await link.balanceOf(trader1.address)).to.equal(200);
            expect(await wallet.balances(trader1.address, ethers.utils.formatBytes32String(`${link.symbol()}`))).to.equal(300);
           })
        it("Should handle withdrawal correctly", async ()=> {
            await wallet.addToken(ethers.utils.formatBytes32String(`${link.symbol()}`), link.address);  
            await link.transfer(trader1.address, 500);
            await expect( wallet.connect(trader1).withdraw(200, ethers.utils.formatBytes32String(`${link.symbol()}`)))
            .to.be.revertedWith("Balance is not sufficient");
            await link.connect(trader1).approve(wallet.address,500);
            await wallet.connect(trader1).deposit(300,ethers.utils.formatBytes32String(`${link.symbol()}`));
            await wallet.connect(trader1).withdraw(200, ethers.utils.formatBytes32String(`${link.symbol()}`));
            expect(await wallet.balances(trader1.address, ethers.utils.formatBytes32String(`${link.symbol()}`))).to.equal(100);
        })
    })        
})
