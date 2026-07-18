// Demo CLI script to show active strategies and opportunities

import { scanAllMarkets } from './src/scanner.js';
import { findConvergenceOpportunities } from './src/strategies/convergence.js';
import { findArbitrageOpportunities } from './src/strategies/arbitrage.js';

console.log('\n🌳 BENTO BONSAI - STRATEGY DEMO\n');
console.log('═'.repeat(80));
console.log('Scanning markets for convergence & arbitrage opportunities...\n');

async function runDemo() {
  try {
    // Fetch all markets
    console.log('📡 Fetching markets from Bento + Polymarket...\n');
    const { bentoMarkets, polyMarkets, allMarkets } = await scanAllMarkets();
    
    console.log(`✅ Found ${bentoMarkets.length} Bento markets`);
    console.log(`✅ Found ${polyMarkets.length} Polymarket markets (demo data)`);
    console.log(`✅ Total: ${allMarkets.length} markets\n`);
    
    console.log('═'.repeat(80));
    
    // Find convergence opportunities
    console.log('\n🎯 STRATEGY 1: CONVERGENCE (High Probability Bets)\n');
    console.log('Looking for markets with >99% probability near resolution...\n');
    
    const convergenceOpps = findConvergenceOpportunities(allMarkets);
    
    if (convergenceOpps.length === 0) {
      console.log('❌ No convergence opportunities found (need markets near expiry with >99% probability)\n');
    } else {
      console.log(`✅ Found ${convergenceOpps.length} convergence opportunities:\n`);
      
      convergenceOpps.slice(0, 5).forEach((opp, i) => {
        console.log(`${i + 1}. ${opp.title || opp.market?.title || 'Unknown Market'}`);
        console.log(`   Platform: ${opp.platform || opp.market?.platform || 'N/A'}`);
        console.log(`   YES: ${((opp.yesPrice || opp.market?.yesPrice || 0) * 100).toFixed(2)}% | NO: ${((opp.noPrice || opp.market?.noPrice || 0) * 100).toFixed(2)}%`);
        console.log(`   Liquidity: $${(opp.liquidity || opp.market?.liquidity || 0).toLocaleString()}`);
        console.log(`   Expiry: ${new Date(opp.expiryTime || opp.market?.expiryTime || Date.now()).toLocaleString()}`);
        console.log(`   Expected ROI: ${opp.expectedReturn ? (opp.expectedReturn * 100).toFixed(2) + '%' : 'N/A'}`);
        console.log('');
      });
    }
    
    console.log('═'.repeat(80));
    
    // Find arbitrage opportunities
    console.log('\n🔄 STRATEGY 2: ARBITRAGE (Cross-Platform Price Mismatches)\n');
    console.log('Looking for same market with different prices on Bento vs Polymarket...\n');
    
    const arbOpps = findArbitrageOpportunities();
    
    if (arbOpps.length === 0) {
      console.log('❌ No arbitrage opportunities found\n');
      console.log('ℹ️  Note: Demo arbitrage uses hardcoded pairs. In production, this would:\n');
      console.log('   - Match markets by title/description similarity');
      console.log('   - Find price discrepancies between platforms');
      console.log('   - Execute simultaneous buy/sell orders');
      console.log('   - Lock in risk-free profit\n');
    } else {
      console.log(`✅ Found ${arbOpps.length} arbitrage opportunities:\n`);
      
      arbOpps.slice(0, 5).forEach((opp, i) => {
        const bentoTitle = opp.bentoMarket?.title || opp.title || 'Unknown Market';
        const bentoYes = ((opp.bentoMarket?.yesPrice || 0) * 100).toFixed(2);
        const polyYes = ((opp.polyMarket?.yesPrice || 0) * 100).toFixed(2);
        const priceDiff = ((opp.priceDifference || 0) * 100).toFixed(2);
        const profit = ((opp.expectedProfit || 0) * 100).toFixed(2);
        
        console.log(`${i + 1}. ${bentoTitle}`);
        console.log(`   Bento YES: ${bentoYes}% | Polymarket YES: ${polyYes}%`);
        console.log(`   Price Diff: ${priceDiff}%`);
        console.log(`   Expected Profit: ${profit}% (risk-free)`);
        console.log('');
      });
    }
    
    console.log('═'.repeat(80));
    
    // Summary
    console.log('\n📊 STRATEGY SUMMARY\n');
    console.log(`Total Markets Scanned: ${allMarkets.length}`);
    console.log(`Convergence Opportunities: ${convergenceOpps.length}`);
    console.log(`Arbitrage Opportunities: ${arbOpps.length}`);
    console.log(`Combined Opportunities: ${convergenceOpps.length + arbOpps.length}\n`);
    
    console.log('💡 PAPER TRADING MODE\n');
    console.log('User stakes $100 USDC → Gets 100 tries');
    console.log('Each correct answer → $1 allocated to strategies');
    console.log('Strategies run in background (simulated)');
    console.log('All profits/losses tracked in trade history\n');
    
    console.log('═'.repeat(80));
    console.log('\n✅ Demo complete! This is what runs behind the Bonsai game.\n');
    
  } catch (err) {
    console.error('\n❌ Error running demo:', err.message);
    console.error(err);
  }
}

runDemo();
