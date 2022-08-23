import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CrowdfundingTutorial } from "../target/types/crowdfunding_tutorial";

describe("crowdfunding-tutorial", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.CrowdfundingTutorial as Program<CrowdfundingTutorial>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
