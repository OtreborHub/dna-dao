import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import { DNAERC20 } from "../typechain-types/contracts/DNAERC20";
import { DNADAO } from "../typechain-types/contracts/DNADAO";

function generateProposalAddress(value: string): string {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(value));
    const address = '0x' + hash.slice(26);
    return ethers.getAddress(address);
}

describe("DAO Contract", function () {

    async function deployDAOFixture() {
        const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        
        const token: DNAERC20 = await hre.ethers.deployContract("DNAERC20", ["DnA Token", "DNA", ethers.parseEther("1000"), 1])
        const dao: DNADAO = await hre.ethers.deployContract("DNADAO", [token.getAddress(), ethers.parseEther("1")]);

        await token.connect(addr1).buyDNA({value: ethers.parseEther("10")});
        await token.connect(addr2).buyDNA({value: ethers.parseEther("10")});
        
        const title = "Test Proposal";
        const description = "This is a test proposal";

        return { dao, token, owner, addr1, addr2, addrs, title, description };
    }

    it("Should allow users to buy shares", async function () {
        const { dao, token, addr1 } = await loadFixture(deployDAOFixture);
        
        expect(await token.balanceOf(addr1)).to.equal(ethers.parseEther("10"));
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);
        expect(await dao.shares(addr1.address)).to.equal(10);
    });

    it("Should allow members to propose decisions without transfer", async function () {
        const { dao, token, addr1, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, ethers.getAddress("0x0000000000000000000000000000000000000000"), ethers.parseEther("0"));
        const proposalAddr = generateProposalAddress(title + description);
        const proposals = await dao.getProposals();
        expect(proposalAddr).to.equal(proposals[0].proposalAddr);

        expect(proposals.length).to.equal(1);
        expect(proposals[0].title).to.equal("Test Proposal");
    });

    it("Should allow members to propose decisions with transfer", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        const proposalAddr = generateProposalAddress(title + description);
        const proposals = await dao.getProposals();
        expect(proposalAddr).to.equal(proposals[0].proposalAddr);

        expect(proposals.length).to.equal(1);
        expect(proposals[0].title).to.equal("Test Proposal");
    });

    it("Should allow members to vote on proposals", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        const proposalAddr = generateProposalAddress(title + description);
        
        let proposals = await dao.getProposals();
        expect(proposalAddr).to.equal(proposals[0].proposalAddr);

        await dao.connect(addr1).vote(proposalAddr, true, false);

        proposals = await dao.getProposals();
        expect(proposals[0].voteCountPro).to.equal(10);
    });

    it("Should allow vote delegation and execute proposal with transfer", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);
        await token.connect(addr2).approve(dao.getAddress(), ethers.parseEther("5"));
        await dao.connect(addr2).buyShares(5);

        expect(await dao.shares(addr1.address)).to.equal(10);
        expect(await dao.shares(addr2.address)).to.equal(5);

        await dao.connect(addr2).delegateVote(addr1.address);
        
        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        const proposalAddr = generateProposalAddress(title + description);

        let proposals = await dao.getProposals();
        expect(proposalAddr).to.equal(proposals[0].proposalAddr);
        
        await dao.connect(addr1).vote(proposalAddr, true, false);

        proposals = await dao.getProposals();
        expect(proposals[0].voteCountPro).to.equal(15); // addr2's votes are delegated to addr1

        await dao.executeProposal(proposalAddr);

        proposals = await dao.getProposals();
        expect(proposals[0].executed).to.be.true;
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("6")); // 5 initial + 1 from proposal
    });

    it("Should execute proposals with majority vote", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        const proposalAddr = generateProposalAddress(title + description);

        let proposals = await dao.getProposals();
        expect(proposalAddr).to.equal(proposals[0].proposalAddr);

        await dao.connect(addr1).vote(proposalAddr, true, false);

        await dao.executeProposal(proposalAddr);

        proposals = await dao.getProposals();
        expect(proposals[0].executed).to.be.true;
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("11"));
    });

    it("Should not execute proposals with minority vote", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        const proposalAddr = generateProposalAddress(title + description);

        let proposals = await dao.getProposals();
        expect(proposalAddr).to.equal(proposals[0].proposalAddr);

        await dao.connect(addr1).vote(proposalAddr, false, false);

        await dao.executeProposal(proposalAddr);

        proposals = await dao.getProposals();
        expect(proposals[0].executed).to.be.false;
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("10"));
    });

    it("Should not allow execute if sender is not the owner", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        const proposalAddr = generateProposalAddress(title + description);

        let proposals = await dao.getProposals();
        expect(proposalAddr).to.equal(proposals[0].proposalAddr);

        await expect(dao.connect(addr1).executeProposal(proposalAddr)).to.be.revertedWith("Sender must be the owner");
    });

    it("Should not allow execute already executed proposals", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        const proposalAddr = generateProposalAddress(title + description);

        let proposals = await dao.getProposals();
        expect(proposalAddr).to.equal(proposals[0].proposalAddr);

        await dao.connect(addr1).vote(proposalAddr, true, false);

        await dao.executeProposal(proposalAddr);

        proposals = await dao.getProposals();
        expect(proposals[0].executed).to.be.true;

        await expect(dao.executeProposal(proposalAddr)).to.be.revertedWith("Proposal already executed");
    });

    it("Should not allow voting if no shares are owned", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        const proposalAddr = generateProposalAddress(title + description);

        const proposals = await dao.getProposals();
        expect(proposalAddr).to.equal(proposals[0].proposalAddr);

        await expect(dao.connect(addr2).vote(proposalAddr, true, false)).to.be.revertedWith("Sender must be a member");
    });

    it("Should end the sale when called by owner", async function () {
        const { dao } = await loadFixture(deployDAOFixture);
        await dao.endSale();
        expect(await dao.saleActive()).to.be.false;
    });

    it("Should not end the sale when not called by owner", async function () {
        const { dao, addr1 } = await loadFixture(deployDAOFixture);
        await expect(dao.connect(addr1).endSale()).to.be.revertedWith("Sender must be the owner");
        expect(await dao.saleActive()).to.be.true;
    });
});