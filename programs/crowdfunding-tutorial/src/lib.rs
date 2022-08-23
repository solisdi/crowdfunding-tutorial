use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

declare_id!("Hgj3KQYRQBXjPxzK3pxbnnv5CsMpFpuLnR1ZySYqs5Vy");

#[program]
pub mod crowdfunding_tutorial {
    use super::*;

    // pub = public
    // fn = function
    // Create Campaign - Only 1 can donate on the campaign, and only the owner will be allowed to withdraw from the campaign
    // You cannot store any data on Solana blockchain, you need to create an Account to store data
    // Returns Result<()> - easy way to serve function results and errors
    pub fn create(ctx: Context<Create>, name: String, description: String) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign; // &mut because we want to modify the account
        campaign.name = name;
        campaign.description = description;
        campaign.amount_donated = 0;
        campaign.admin = *ctx.accounts.user.key;
        Ok(())
    }

    // Withdraw funds from the campaign account and put the funds to the user account
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> ProgramResult {
        // We need to retrieve 2 accounts - the campaign account and the user account
        let campaign = &mut ctx.accounts.campaign;
        let user = &mut ctx.accounts.user;

        if campaign.admin != *user.key {
            return Err(ProgramError::IncorrectProgramId);
        }

        // Rent exemption = you have to have 2 years of rent balance to get this exemption
        // we need to calculate the rent_balance so that we would not withdraw these funds
        // rent is dependent on the amount of data stored in the account -> this is why we need to use campaign.to_account_info().data_len()
        let rent_balance = Rent::get()?.minimum_balance(campaign.to_account_info().data_len());

        // check if the campaign account has the funds to withdraw
        if **campaign.to_account_info().lamports.borrow() - rent_balance < amount { 
            return Err(ProgramError::InsufficientFunds); // if the funds is less than the amount to be withdrawn throw an error
        }

        // deduct from campaign account and move to user account
        **campaign.to_account_info().try_borrow_mut_lamports()? -= amount;
        **user.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    pub fn donate(ctx: Context<Donate>, amount: u64) -> ProgramResult {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.campaign.key(),
            amount
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.campaign.to_account_info()
            ]
        );
        (&mut ctx.accounts.campaign).amount_donated += amount;
        Ok(())
    }
}

#[derive(Accounts)] //macro
pub struct Create<'info> {
    // initialize or create a new campaign object
    // payer = who will be paying, in this case the user
    // space = amount of space will be allocated for this in the blockchain
    // seeds = not sure 
    #[account(init, payer=user, space=9000, seeds=[b"CAMPAIGN_DEMO".as_ref(), user.key().as_ref()], bump)] 
    pub campaign: Account<'info, Campaign>,

    // Signer because they will be the one to sign the transaction
    // system program is required. It is the system specifications of the solana blockchain
    // we do not use INIT in this case because we are not creating a new user / system program
    // account(mut) means that the User account is mutable
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    
    #[account(mut)]
    pub user: Signer<'info>
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>
}

// Campaign Class
#[account]
pub struct Campaign {
    pub admin: Pubkey,
    pub name: String,
    pub description: String,
    pub amount_donated: u64
}
