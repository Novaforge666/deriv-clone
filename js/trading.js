// js/trading.js

class TradingManager {
    constructor() {
        this.currentSymbol = 'R_100';
        this.currentProposal = null;
        this.activeContracts = [];
        this.proposalSubscription = null;
    }

    // Get price proposal
    async getProposal(params) {
        try {
            const request = {
                proposal: 1,
                amount: params.amount || 10,
                basis: 'stake',
                contract_type: params.contractType, // 'CALL' or 'PUT'
                currency: 'USD',
                duration: params.duration || 5,
                duration_unit: params.durationUnit || 'm',
                symbol: this.currentSymbol,
                subscribe: 1
            };

            const response = await derivWS.send(request);
            return response.proposal;
        } catch (error) {
            console.error('Proposal error:', error);
            throw error;
        }
    }

    // Subscribe to proposals for both Rise and Fall
    subscribeProposals(amount, duration, durationUnit) {
        // Forget previous proposals
        derivWS.sendRaw({ forget_all: 'proposal' });

        // Rise proposal
        derivWS.sendRaw({
            proposal: 1,
            amount: amount,
            basis: 'stake',
            contract_type: 'CALL',
            currency: 'USD',
            duration: duration,
            duration_unit: durationUnit,
            symbol: this.currentSymbol,
            subscribe: 1
        });

        // Fall proposal
        derivWS.sendRaw({
            proposal: 1,
            amount: amount,
            basis: 'stake',
            contract_type: 'PUT',
            currency: 'USD',
            duration: duration,
            duration_unit: durationUnit,
            symbol: this.currentSymbol,
            subscribe: 1
        });

        // Listen for proposal updates
        derivWS.subscribe('proposal', (proposal) => {
            this.updateProposalUI(proposal);
        });
    }

    updateProposalUI(proposal) {
        const payout = parseFloat(proposal.payout).toFixed(2);
        const profit = (parseFloat(proposal.payout) - parseFloat(proposal.ask_price)).toFixed(2);

        if (proposal.contract_type === 'CALL') {
            const risePayout = document.getElementById('risePayout');
            if (risePayout) risePayout.textContent = `$${payout}`;
        } else if (proposal.contract_type === 'PUT') {
            const fallPayout = document.getElementById('fallPayout');
            if (fallPayout) fallPayout.textContent = `$${payout}`;
        }

        // Update general payout display
        const payoutValue = document.getElementById('payoutValue');
        const profitValue = document.getElementById('profitValue');
        if (payoutValue) payoutValue.textContent = `$${payout}`;
        if (profitValue) {
            profitValue.textContent = `$${profit}`;
            profitValue.className = `payout-value ${parseFloat(profit) >= 0 ? 'positive' : 'negative'}`;
        }

        this.currentProposal = proposal;
    }

    // Buy contract
    async buyContract(proposalId, price) {
        try {
            const response = await derivWS.send({
                buy: proposalId,
                price: price
            });

            if (response.buy) {
                const contract = response.buy;
                this.activeContracts.push(contract);
                this.subscribeToContract(contract.contract_id);

                showToast('success', `Contract purchased! ID: ${contract.contract_id}`);
                return contract;
            }
        } catch (error) {
            showToast('error', `Trade failed: ${error.message}`);
            throw error;
        }
    }

    // Quick buy (Rise/Fall)
    async quickBuy(contractType) {
        const stakeInput = document.getElementById('stakeAmount');
        const durationInput = document.getElementById('durationValue');
        const durationTypeSelect = document.getElementById('durationType');

        const amount = parseFloat(stakeInput.value);
        const duration = parseInt(durationInput.value);
        const durationUnit = durationTypeSelect.value;

        try {
            // Get fresh proposal
            const proposal = await this.getProposal({
                amount,
                contractType,
                duration,
                durationUnit
            });

            // Buy it
            const contract = await this.buyContract(proposal.id, proposal.ask_price);
            return contract;
        } catch (error) {
            console.error('Quick buy failed:', error);
        }
    }

    // Subscribe to contract updates
    subscribeToContract(contractId) {
        derivWS.sendRaw({
            proposal_open_contract: 1,
            contract_id: contractId,
            subscribe: 1
        });

        derivWS.subscribe('proposal_open_contract', (contract) => {
            this.updateContractUI(contract);
        });
    }

    updateContractUI(contract) {
        const contractsList = document.getElementById('contractsList');
        const contractCount = document.getElementById('contractCount');

        if (!contractsList) return;

        let existingCard = document.getElementById(`contract-${contract.contract_id}`);

        const pnl = parseFloat(contract.profit || 0).toFixed(2);
        const isProfit = parseFloat(pnl) >= 0;

        if (contract.is_sold) {
            // Contract settled
            if (existingCard) {
                existingCard.remove();
            }

            showToast(
                isProfit ? 'success' : 'error',
                `Contract ${contract.contract_id}: ${isProfit ? 'Won' : 'Lost'} $${Math.abs(pnl)}`
            );

            this.activeContracts = this.activeContracts.filter(c => c.contract_id !== contract.contract_id);
        } else {
            const cardHTML = `
                <div class="contract-card ${isProfit ? '' : 'loss'}" id="contract-${contract.contract_id}">
                    <div class="contract-header">
                        <span class="contract-type">${contract.contract_type === 'CALL' ? '↑ Rise' : '↓ Fall'}</span>
                        <span class="contract-pnl ${isProfit ? 'positive' : 'negative'}">${isProfit ? '+' : ''}$${pnl}</span>
                    </div>
                    <div class="contract-details">
                        <span>${contract.underlying || ''}</span>
                        <span>Stake: $${parseFloat(contract.buy_price || 0).toFixed(2)}</span>
                    </div>
                </div>
            `;

            if (existingCard) {
                existingCard.outerHTML = cardHTML;
            } else {
                contractsList.insertAdjacentHTML('afterbegin', cardHTML);
            }
        }

        if (contractCount) {
            contractCount.textContent = this.activeContracts.length;
        }
    }

    // Get active symbols / markets
    async getActiveSymbols() {
        try {
            const response = await derivWS.send({
                active_symbols: 'brief',
                product_type: 'basic'
            });
            return response.active_symbols || [];
        } catch (error) {
            console.error('Failed to get active symbols:', error);
            return [];
        }
    }

    setSymbol(symbol) {
        this.currentSymbol = symbol;
        derivWS.sendRaw({ forget_all: 'proposal' });

        // Re-subscribe proposals
        const stakeInput = document.getElementById('stakeAmount');
        const durationInput = document.getElementById('durationValue');
        const durationTypeSelect = document.getElementById('durationType');

        if (stakeInput && durationInput && durationTypeSelect) {
            this.subscribeProposals(
                parseFloat(stakeInput.value),
                parseInt(durationInput.value),
                durationTypeSelect.value
            );
        }
    }
}

const trading = new TradingManager();