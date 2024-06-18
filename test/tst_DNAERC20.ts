import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import { DNAERC20 } from "../typechain-types/contracts/DNAERC20";
import { DNADAO } from "../typechain-types/contracts/DNADAO";

describe ("ERC20 DNA Contract", function () {
  async function deployDAOFixture() {
      const [owner, addr1, addr2 ] = await ethers.getSigners();
      const token: DNAERC20 = await hre.ethers.deployContract("DNAERC20", ["DnA Token", "DNA", ethers.parseEther("1000"), 1])
      const dao: DNADAO = await hre.ethers.deployContract("DNADAO", [token.getAddress(), ethers.parseEther("1")]);
      return { token, dao, owner, addr1, addr2 };
  }

  it("Should allow sender buy DNA Token", async function () {
      const { token, addr1 } = await loadFixture(deployDAOFixture);
      
      await token.connect(addr1).buyDNA({value: ethers.parseEther("10")})
      expect(await token.balanceOf(addr1.address)).to.be.equal(ethers.parseEther("10"));
  });

  it("Should allow sender to approve DNA", async function () {
      const { token, dao, addr1 } = await loadFixture(deployDAOFixture);
      
      await token.connect(addr1).buyDNA({value: ethers.parseEther("10")});
      await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));

      expect(await token.allowance(addr1.address, dao.getAddress())).to.be.equal(ethers.parseEther("10"));
  });

  it("Should allow owner changing DNA Token price", async function () {
      const { token, dao, owner, addr1, addr2 } = await loadFixture(deployDAOFixture);
      
      await token.connect(addr1).buyDNA({value: ethers.parseEther("10")});
      await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
      expect(await token.allowance(addr1.address, dao.getAddress())).to.be.equal(ethers.parseEther("10"));

      await token.connect(owner).updateTokenPrice(2);

      await token.connect(addr2).buyDNA({value: ethers.parseEther("10")});
      expect(await token.connect(addr2).approve(dao.getAddress(), ethers.parseEther("10"))).to.be.reverted;
      expect(await token.balanceOf(addr2.address)).to.be.equal(ethers.parseEther("5"));

      await token.connect(addr2).approve(dao.getAddress(), ethers.parseEther("5"));
      expect(await token.allowance(addr2.address, dao.getAddress())).to.be.equal(ethers.parseEther("5"));
  });

    it("Should not allow user changing DNA Token price", async function () {
        const { token, addr1 } = await loadFixture(deployDAOFixture);
        
        await token.connect(addr1).buyDNA({value: ethers.parseEther("10")});
        await expect (token.connect(addr1).updateTokenPrice(2)).to.be.revertedWith("Sender must be the owner");
    });
});

describe ("DNA Token Event", function () {
  async function deployDAOFixture() {
      const [owner, addr1 ] = await ethers.getSigners();
      const token: DNAERC20 = await hre.ethers.deployContract("DNAERC20", ["DnA Token", "DNA", ethers.parseEther("1000"), 1])
      const dao: DNADAO = await hre.ethers.deployContract("DNADAO", [token.getAddress(), ethers.parseEther("1")]);
      return { token, dao, owner, addr1 };
  }

  it("Should launch BuyOrder Event", async function () {
      const { token, addr1 } = await loadFixture(deployDAOFixture);
      
      await expect( 
          token.connect(addr1).buyDNA({value: ethers.parseEther("10")})
          ).to.emit(token, "BuyOrder")
  });

  it("Should launch Approval Event", async function () {
      const { token, dao, addr1 } = await loadFixture(deployDAOFixture);
      
      await token.connect(addr1).buyDNA({value: ethers.parseEther("10")});
      await expect(
          token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"))
          ).to.emit(token, "Approval");
  });

  it("Should launch UpdatePrice Event", async function () {
    const { token, owner, addr1 } = await loadFixture(deployDAOFixture);
    await expect(
        token.connect(owner).updateTokenPrice(2)
        ).to.emit(token, "UpdatePrice");
});
});