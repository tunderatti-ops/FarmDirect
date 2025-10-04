# FarmDirect# 🌾 FarmDirect: Decentralized Marketplace for Farmer-Consumer Sales

Welcome to FarmDirect, a blockchain-powered platform that connects farmers directly with consumers, eliminating costly middlemen! Built on the Stacks blockchain using Clarity smart contracts, this project empowers small-scale farmers to sell their produce at fair prices while giving consumers access to fresh, traceable goods. Say goodbye to inflated prices and hello to transparent, trustless transactions.

## ✨ Features

🌱 Farmer registration and verification to ensure authenticity  
🛒 Product listings with detailed descriptions, prices, and availability  
💸 Secure escrow payments using STX or custom tokens  
🚚 Order tracking and fulfillment with blockchain timestamps  
⚖️ Dispute resolution through community voting  
📊 Review and rating system for building trust  
🔒 Immutable records for supply chain transparency  
📈 Analytics dashboard for farmers to track sales  
🤝 Cooperative features for farmer groups to pool resources  

## 🛠 How It Works

FarmDirect uses 8 interconnected Clarity smart contracts to create a robust, decentralized ecosystem. Here's a breakdown:

### Core Smart Contracts
1. **UserRegistry.clar**: Handles registration of farmers and consumers, including KYC-like verification hashes for authenticity (e.g., proof of farm ownership).  
2. **ProductCatalog.clar**: Allows farmers to list products with metadata like type, quantity, price, and harvest timestamps. Uses NFTs to represent unique batches of produce.  
3. **OrderManager.clar**: Manages order placement, matching buyers with sellers, and tracking order status (pending, shipped, delivered).  
4. **EscrowPayment.clar**: Secures funds in escrow until delivery confirmation, supporting STX transfers or fungible tokens for payments.  
5. **DisputeResolver.clar**: Enables dispute filing with evidence uploads (hashes); resolves via time-locked voting by staked token holders.  
6. **ReviewSystem.clar**: Records post-transaction reviews and ratings, calculating reputation scores immutably.  
7. **SupplyChainTracker.clar**: Logs key events like harvesting, packaging, and shipping with timestamps for full traceability.  
8. **GovernanceDAO.clar**: Manages platform upgrades, fee settings, and community proposals using a DAO token for voting.

### For Farmers
- Register your profile via UserRegistry with a verification hash.  
- List your produce in ProductCatalog, setting prices and quantities.  
- When an order comes in through OrderManager, pack and ship—update status in SupplyChainTracker.  
- Funds release from EscrowPayment upon consumer confirmation.  
- Use ReviewSystem to build your reputation and GovernanceDAO to influence platform decisions.

### For Consumers
- Browse listings in ProductCatalog and place orders via OrderManager.  
- Pay into EscrowPayment for secure holding.  
- Track your order's journey with SupplyChainTracker.  
- Confirm delivery to release funds; file disputes in DisputeResolver if needed.  
- Leave reviews in ReviewSystem to help the community.

### Real-World Impact
This solves the problem of middlemen exploiting farmers by taking huge cuts (often 50-70% of retail price). By going direct, farmers earn more, consumers pay less, and everything is transparent on the blockchain. Plus, it promotes sustainable agriculture through traceable sourcing.

Get started by deploying these contracts on Stacks testnet and building a simple frontend dApp! 🚀