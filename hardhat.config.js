/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-waffle");

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();
  for(const account of accounts){
    console.log(account.address);
  }
});
 
module.exports = {
  solidity: "0.8.13",
};
