import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import { DNAERC20 } from "../typechain-types/contracts/DNAERC20";
import { DNADAO } from "../typechain-types/contracts/DNADAO";

describe("DAO Contract", function () {

    async function deployDAOFixture() {
        const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        
        const token: DNAERC20 = await hre.ethers.deployContract("DNAERC20", ["DNA Token", "DNA", ethers.parseEther("1000")])
        const dao: DNADAO = await hre.ethers.deployContract("DNADAO", [token.getAddress(), ethers.parseEther("1")]);

        await token.transfer(addr1.address, ethers.parseEther("10"));
        await token.transfer(addr2.address, ethers.parseEther("10"));

        return { dao, token, owner, addr1, addr2, addrs };
    }

    it("Should allow users to buy shares", async function () {
        const { dao, token, addr1 } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);
        expect(await dao.shares(addr1.address)).to.equal(10);
    });

    it("Should allow members to propose decisions", async function () {
        const { dao, token, addr1 } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal("Test Proposal", "This is a test proposal", addr1.address, ethers.parseEther("1"));
        const proposals = await dao.getProposals();
        expect(proposals.length).to.equal(1);
        expect(proposals[0].title).to.equal("Test Proposal");
    });

    it("Should allow members to vote on proposals", async function () {
        const { dao, token, addr1 } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal("Test Proposal", "This is a test proposal", addr1.address, ethers.parseEther("1"));

        await dao.connect(addr1).vote(0, true, false);
        const proposals = await dao.getProposals();
        expect(proposals[0].voteCountPro).to.equal(10);
    });

    it("Should allow vote delegation", async function () {
        const { dao, token, addr1, addr2 } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);
        await token.connect(addr2).approve(dao.getAddress(), ethers.parseEther("5"));
        await dao.connect(addr2).buyShares(5);

        expect(await dao.shares(addr1.address)).to.equal(10);
        expect(await dao.shares(addr2.address)).to.equal(5);

        await dao.connect(addr2).delegateVote(addr1.address);
        await dao.connect(addr2).createProposal("Delegated Vote Proposal", "Proposal with delegated votes", addr2.address, ethers.parseEther("1"));

        await dao.connect(addr1).vote(0, true, false);
        const proposals = await dao.getProposals();
        expect(proposals[0].voteCountPro).to.equal(15); // addr1's votes are delegated to addr2

        await dao.executeProposal(0);

        const executedProposal = await dao.getProposals();
        expect(executedProposal[0].executed).to.be.true;
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("6")); // 5 initial + 1 from proposal
    });

    it("Should execute proposals with majority vote", async function () {
        const { dao, token, addr1, addr2 } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal("Test Proposal", "This is a test proposal", addr2.address, ethers.parseEther("1"));
        await dao.connect(addr1).vote(0, true, false);

        await dao.executeProposal(0);

        const proposals = await dao.getProposals();
        expect(proposals[0].executed).to.be.true;
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("11"));
    });

    it("Should not allow voting if no shares are owned", async function () {
        const { dao, addr2 } = await loadFixture(deployDAOFixture);
        await expect(dao.connect(addr2).vote(0, true, false)).to.be.revertedWith("Sender must be a member");
    });

    it("Should end the sale when called by admin", async function () {
        const { dao } = await loadFixture(deployDAOFixture);
        await dao.endSale();
        expect(await dao.saleActive()).to.be.false;
    });
});