document.addEventListener('DOMContentLoaded', () => {
    let CURRENT_NUM_DECKS = 6;
    const RESHUFFLE_PENETRATION = 0.25;

    const SUITS = ['H', 'D', 'C', 'S'];
    const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

    let shoe = [];
    let playerHand = [];
    let dealerHand = [];
    let playerSplitHand = [];
    let isSplitHandActive = false;

    let runningCount = 0;
    let cardsDealtSinceShuffle = 0;
    let isLiveRcRevealed = false;
    let gamePhase = 'INIT'; // Start in INIT phase

    let stats = {
        handsPlayed: 0, wins: 0, losses: 0, pushes: 0,
        blackjacks: 0, unitsBet: 0, unitsNet: 0,
    };

    // DOM Elements
    const gameTitleEl = document.getElementById('game-title');
    const deckSelectEl = document.getElementById('deck-select');
    const resetStatsBtn = document.getElementById('reset-stats-btn');

    const dealerCardsEl = document.getElementById('dealer-cards');
    const playerCardsEl = document.getElementById('player-cards');
    const playerSplitCardsEl = document.getElementById('player-cards-split');
    const splitHandAreaEl = document.getElementById('split-hand-area');
    const dealerScoreEl = document.getElementById('dealer-score');
    const playerScoreEl = document.getElementById('player-score');
    const playerSplitScoreEl = document.getElementById('player-score-split');
    const messageEl = document.getElementById('message');
    const rcFeedbackEl = document.getElementById('rc-feedback');
    const bsFeedbackEl = document.getElementById('bs-feedback');
    const runningCountGuessInput = document.getElementById('running-count-guess');
    const strategyGuessInput = document.getElementById('strategy-guess');
    const cardsRemainingEl = document.getElementById('cards-remaining');
    const decksRemainingEl = document.getElementById('decks-remaining');
    const penetrationDisplayEl = document.getElementById('penetration-display');
    const deviationInfoEl = document.getElementById('deviation-info');
    const liveRcValueEl = document.getElementById('live-rc-value');
    const revealRcBtn = document.getElementById('reveal-rc-btn');
    const hitBtn = document.getElementById('hit-btn');
    const standBtn = document.getElementById('stand-btn');
    const doubleBtn = document.getElementById('double-btn');
    const splitBtn = document.getElementById('split-btn');
    const nextHandBtn = document.getElementById('next-hand-btn');
    const submitGuessesBtn = document.getElementById('submit-guesses-btn');

    const statHandsPlayedEl = document.getElementById('stat-hands-played');
    const statWinsEl = document.getElementById('stat-wins');
    const statWinPctEl = document.getElementById('stat-win-pct');
    const statLossesEl = document.getElementById('stat-losses');
    const statLossPctEl = document.getElementById('stat-loss-pct');
    const statPushesEl = document.getElementById('stat-pushes');
    const statPushPctEl = document.getElementById('stat-push-pct');
    const statBlackjacksEl = document.getElementById('stat-blackjacks');
    const statUnitsNetEl = document.getElementById('stat-units-net');
    const trueCountValueMainEl = document.getElementById('true-count-value-main');
    const perceivedEdgeEl = document.getElementById('perceived-edge');
    const recommendedBetEl = document.getElementById('recommended-bet');

    const DEVIATIONS_MULTI_DECK_H17 = {
        "INSURANCE_A": { tcThreshold: 3, play: 'Y', bsPlay: 'N', condition: '>=', note: "Take Insurance" },
        "H16_T": { tcThreshold: 0, play: 'S', bsPlay: 'H', condition: '>=', note: "Stand 16 vs 10 (Multi-Deck)" },
        "H15_T": { tcThreshold: 4, play: 'S', bsPlay: 'H', condition: '>=', note: "Stand 15 vs 10" },
        "PT_5":  { tcThreshold: 5, play: 'P', bsPlay: 'S', condition: '>=', note: "Split Tens vs 5" },
        "PT_6":  { tcThreshold: 4, play: 'P', bsPlay: 'S', condition: '>=', note: "Split Tens vs 6" },
        "H10_T": { tcThreshold: 4, play: 'D', bsPlay: 'H', condition: '>=', note: "Double 10 vs 10" },
        "H10_A": { tcThreshold: 4, play: 'D', bsPlay: 'H', condition: '>=', note: "Double 10 vs Ace" },
        "H12_3": { tcThreshold: 2, play: 'S', bsPlay: 'H', condition: '>=', note: "Stand 12 vs 3" },
        "H12_2": { tcThreshold: 3, play: 'S', bsPlay: 'H', condition: '>=', note: "Stand 12 vs 2" },
        "H11_A": { tcThreshold: 1, play: 'D', bsPlay: 'H', condition: '>=', note: "Double 11 vs Ace (Multi-Deck)" },
        "H9_2":  { tcThreshold: 1, play: 'D', bsPlay: 'H', condition: '>=', note: "Double 9 vs 2" },
        "H9_7":  { tcThreshold: 3, play: 'D', bsPlay: 'H', condition: '>=', note: "Double 9 vs 7" },
        "H13_2": { tcThreshold: -1, play: 'S', bsPlay: 'H', condition: '<=', note: "Stand 13 vs 2 (TC <= -1)" },
        "H12_4": { tcThreshold: 0,  play: 'H', bsPlay: 'S', condition: '<=', note: "Hit 12 vs 4 (TC <= 0, if BS is S)" },
    };

    function createCard(suit, rank) {
        let value; let countValue;
        if (['T', 'J', 'Q', 'K'].includes(rank)) { value = 10; countValue = -1; }
        else if (rank === 'A') { value = 11; countValue = -1; }
        else {
            value = parseInt(rank);
            if (value >= 2 && value <= 6) countValue = 1;
            else if (value >= 7 && value <= 9) countValue = 0;
        }
        return { suit, rank, value, countValue, display: rank + suit, hidden: false };
    }

    function createShoe() {
        shoe = [];
        for (let i = 0; i < CURRENT_NUM_DECKS; i++) {
            for (const suit of SUITS) { for (const rank of RANKS) { shoe.push(createCard(suit, rank)); } }
        }
        shuffleShoe(); runningCount = 0; cardsDealtSinceShuffle = 0;
        penetrationDisplayEl.textContent = `~${(RESHUFFLE_PENETRATION * 100).toFixed(0)}% of ${CURRENT_NUM_DECKS * 52} cards`;
        updateLiveRcDisplay(); updateGameTitle();
        console.log(`Shoe with ${CURRENT_NUM_DECKS} decks reshuffled. RC reset.`);
    }

    function shuffleShoe() {
        for (let i = shoe.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[shoe[i], shoe[j]] = [shoe[j], shoe[i]]; }
    }

    function dealCard(hand, isVisible = true) {
        if (shoe.length === 0) { createShoe(); if(shoe.length === 0) return null; }
        const card = shoe.pop();
        if (isVisible && !card.hidden) { runningCount += card.countValue; }
        card.hidden = !isVisible; hand.push(card); cardsDealtSinceShuffle++;
        updateShoeInfo(); updateLiveRcDisplay();
        return card;
    }
    
    function updateLiveRcDisplay() {
        liveRcValueEl.textContent = isLiveRcRevealed ? runningCount : '???';
    }
    revealRcBtn.addEventListener('click', () => {
        isLiveRcRevealed = !isLiveRcRevealed; updateLiveRcDisplay();
        revealRcBtn.textContent = isLiveRcRevealed ? '🙈' : '👁️';
    });

    function updateShoeInfo() {
        cardsRemainingEl.textContent = shoe.length;
        const decksLeft = shoe.length / 52;
        decksRemainingEl.textContent = decksLeft.toFixed(1);
        updateStatsAndEdgeDisplay();
    }

    function calculateTrueCount() {
        const decksLeft = shoe.length / 52;
        if (decksLeft < 0.20) return null;
        return runningCount / decksLeft;
    }

    function getHandValue(hand) {
        let value = 0; let aceCount = 0;
        for (const card of hand) {
            if (card.hidden) continue; value += card.value; if (card.rank === 'A') aceCount++;
        }
        while (value > 21 && aceCount > 0) { value -= 10; aceCount--; }
        return value;
    }
    function isBlackjack(hand) { return hand.length === 2 && getHandValue(hand) === 21; }

    function getBasicStrategy(playerHand, dealerUpCard) {
        if (CURRENT_NUM_DECKS === 1) return getBasicStrategy_1D_H17(playerHand, dealerUpCard);
        else if (CURRENT_NUM_DECKS === 2) return getBasicStrategy_2D_H17(playerHand, dealerUpCard);
        else return getBasicStrategy_6D_H17(playerHand, dealerUpCard);
    }

    function getBasicStrategy_6D_H17(playerHand, dealerUpCard) {
        const pValue = getHandValue(playerHand); const dValue = dealerUpCard.value;
        const isSoft = playerHand.some(c => c.rank === 'A' && c.value === 11 && pValue !== playerHand.reduce((sum, card) => sum + (card.rank === 'A' ? 1 : card.value), 0) + (playerHand.filter(c=>c.rank === 'A').length * 10) );
        const canDouble = playerHand.length === 2;

        if (playerHand.length === 2 && playerHand[0].rank === playerHand[1].rank) {
            const pRank = playerHand[0].rank;
            if (pRank === 'A' || pRank === '8') return 'P';
            if (['T', 'J', 'Q', 'K'].includes(pRank)) return 'S';
            if (pRank === '9') return (dValue === 7 || dValue === 10 || dValue === 11) ? 'S' : 'P';
            if (pRank === '7') return (dValue >= 2 && dValue <= 7) ? 'P' : 'H';
            if (pRank === '6') return (dValue >= 2 && dValue <= 6) ? 'P' : 'H';
            if (pRank === '5') return (dValue >= 2 && dValue <= 9 && canDouble) ? 'D' : 'H';
            if (pRank === '4') return ((dValue === 5 || dValue === 6) && canDouble) ? 'P' : 'H'; // Simplified for 6D
            if (pRank === '3' || pRank === '2') return (dValue >= 2 && dValue <= 7) ? 'P' : 'H';
        }
        if (isSoft) {
            if (pValue >= 20) return 'S';
            if (pValue === 19) return (dValue === 6 && canDouble) ? 'D' : 'S';
            if (pValue === 18) {
                if (dValue >= 9 && dValue <= 11) return 'H';
                if (dValue >= 2 && dValue <= 6 && canDouble) return 'D'; return 'S';
            }
            if (pValue === 17) return (dValue >= 3 && dValue <= 6 && canDouble) ? 'D' : 'H';
            if (pValue === 16 || pValue === 15) return (dValue >= 4 && dValue <= 6 && canDouble) ? 'D' : 'H';
            if (pValue === 14 || pValue === 13) return (dValue >= 5 && dValue <= 6 && canDouble) ? 'D' : 'H';
        }
        if (pValue >= 17) return 'S';
        if (pValue >= 13 && pValue <= 16) return (dValue >= 2 && dValue <= 6) ? 'S' : 'H';
        if (pValue === 12) return (dValue >= 4 && dValue <= 6) ? 'S' : 'H';
        if (pValue === 11) return canDouble ? 'D' : 'H';
        if (pValue === 10) return (dValue >= 2 && dValue <= 9 && canDouble) ? 'D' : 'H';
        if (pValue === 9) return (dValue >= 3 && dValue <= 6 && canDouble) ? 'D' : 'H';
        if (pValue <= 8) return 'H';
        return 'S';
    }

    function getBasicStrategy_2D_H17(playerHand, dealerUpCard) {
        const pValue = getHandValue(playerHand); const dValue = dealerUpCard.value;
        const isSoft = playerHand.some(c => c.rank === 'A' && c.value === 11 && pValue !== playerHand.reduce((sum, card) => sum + (card.rank === 'A' ? 1 : card.value), 0) + (playerHand.filter(c=>c.rank === 'A').length * 10) );
        const canDouble = playerHand.length === 2;

        if (playerHand.length === 2 && playerHand[0].rank === playerHand[1].rank) {
            const pRank = playerHand[0].rank;
            if (pRank === 'A' || pRank === '8') return 'P';
            if (['T', 'J', 'Q', 'K'].includes(pRank)) return 'S';
            if (pRank === '9') return (dValue === 7 || dValue === 10 || dValue === 11) ? 'S' : 'P';
            if (pRank === '7') return (dValue >= 2 && dValue <= 7) ? 'P' : 'H';
            if (pRank === '6') return (dValue >= 2 && dValue <= 6) ? 'P' : 'H'; // More H vs 2
            if (pRank === '5') return (dValue >= 2 && dValue <= 9 && canDouble) ? 'D' : 'H';
            if (pRank === '4') return ((dValue === 5 || dValue === 6) && canDouble) ? 'P' : 'H';
            if (pRank === '3' || pRank === '2') return (dValue >= 2 && dValue <= 7) ? 'P' : 'H'; // 3s vs 2-7; 2s vs 2-7
        }
        if (isSoft) {
            if (pValue >= 20) return 'S';
            if (pValue === 19) return (dValue === 6 && canDouble) ? 'D' : 'S';
            if (pValue === 18) {
                if (dValue === 2 && canDouble) return 'D';
                if (dValue >= 3 && dValue <= 6 && canDouble) return 'D';
                if (dValue === 7 || dValue === 8) return 'S'; return 'H';
            }
            if (pValue === 17) return (dValue >= 3 && dValue <= 6 && canDouble) ? 'D' : 'H';
            if (pValue === 16 || pValue === 15) return (dValue >= 4 && dValue <= 6 && canDouble) ? 'D' : 'H';
            if (pValue === 14 || pValue === 13) return (dValue >= 5 && dValue <= 6 && canDouble) ? 'D' : 'H';
        }
        if (pValue >= 17) return 'S';
        if (pValue >= 13 && pValue <= 16) return (dValue >= 2 && dValue <= 6) ? 'S' : 'H';
        if (pValue === 12) return (dValue >= 4 && dValue <= 6) ? 'S' : 'H';
        if (pValue === 11) return (dValue === 11 && !canDouble) ? 'H' : 'D';
        if (pValue === 10) return (dValue >= 2 && dValue <= 9 && canDouble) ? 'D' : 'H';
        if (pValue === 9) return (dValue >= 3 && dValue <= 6 && canDouble) ? 'D' : 'H';
        if (pValue <= 8) return 'H';
        return 'S';
    }

    function getBasicStrategy_1D_H17(playerHand, dealerUpCard) {
        const pValue = getHandValue(playerHand); const dValue = dealerUpCard.value;
        const isSoft = playerHand.some(c => c.rank === 'A' && c.value === 11 && pValue !== playerHand.reduce((sum, card) => sum + (card.rank === 'A' ? 1 : card.value), 0) + (playerHand.filter(c=>c.rank === 'A').length * 10) );
        const canDouble = playerHand.length === 2;

        if (playerHand.length === 2 && playerHand[0].rank === playerHand[1].rank) {
            const pRank = playerHand[0].rank;
            if (pRank === 'A' || pRank === '8') return 'P';
            if (['T', 'J', 'Q', 'K'].includes(pRank)) return 'S';
            if (pRank === '9') return (dValue === 7 || dValue === 10 || dValue === 11) ? 'S' : 'P';
            if (pRank === '7') return (dValue >= 2 && dValue <= 7) ? 'P' : 'H'; // 7,7 vs 8 is H
            if (pRank === '6') return (dValue >= 2 && dValue <= 7) ? 'P' : 'H'; // More liberal split
            if (pRank === '5') return (dValue >= 2 && dValue <= 9 && canDouble) ? 'D' : 'H';
            if (pRank === '4') return ((dValue === 5 || dValue === 6) && canDouble) ? 'P' : 'H';
            if (pRank === '3') return (dValue >= 2 && dValue <= 7) ? 'P' : 'H'; // Split 3,3 vs 4-7 more often H vs 2,3
            if (pRank === '2') return (dValue >= 3 && dValue <= 7) ? 'P' : 'H'; // Split 2,2 vs 3-7
        }
        if (isSoft) {
            if (pValue === 20) return 'S';
            if (pValue === 19) return (dValue === 6 && canDouble) ? 'D' : 'S';
            if (pValue === 18) {
                if (dValue === 2 && canDouble) return 'D';
                if (dValue >= 3 && dValue <= 6 && canDouble) return 'D';
                if (dValue === 7 || dValue === 8) return 'S'; return 'H';
            }
            if (pValue === 17) return (dValue >= 2 && dValue <= 6 && canDouble) ? 'D' : 'H'; // Dbl A6 vs 2-6
            if (pValue === 16 || pValue === 15) return (dValue >= 4 && dValue <= 6 && canDouble) ? 'D' : 'H';
            if (pValue === 14 || pValue === 13) return (dValue >= 5 && dValue <= 6 && canDouble) ? 'D' : 'H';
        }
        if (pValue >= 17) return 'S';
        if (pValue === 16 && dValue >=2 && dValue <=6) return 'S'; else if (pValue === 16) return 'H';// Stand 16 vs T is H, but vs 2-6 is S
        if (pValue === 15) return (dValue >= 2 && dValue <= 6) ? 'S' : 'H';
        if (pValue === 14 || pValue === 13) return (dValue >= 2 && dValue <= 6) ? 'S' : 'H';
        if (pValue === 12) return (dValue >= 4 && dValue <= 6) ? 'S' : 'H'; // 12 vs 2,3 H
        if (pValue === 11) return (dValue === 11 && !canDouble) ? 'H' : 'D';
        if (pValue === 10) return (dValue >= 2 && dValue <= 9 && canDouble) ? 'D' : 'H';
        if (pValue === 9) return (dValue === 2 || (dValue >= 3 && dValue <= 6)) && canDouble ? 'D' : 'H'; // Dbl 9 vs 2
        if (pValue <= 8) return 'H';
        return 'S';
    }

    function getSituationKey(playerHand, dealerUpCard) {
        const pValue = getHandValue(playerHand);
        const dRank = dealerUpCard.rank === 'A' ? 'A' : (['T', 'J', 'Q', 'K'].includes(dealerUpCard.rank) ? 'T' : dealerUpCard.rank);

        if (dealerUpCard.rank === 'A' && playerHand.length === 2) return `INSURANCE_A`;
        if (playerHand.length === 2 && playerHand[0].rank === playerHand[1].rank) {
            let pRankChar = playerHand[0].rank;
            if (['J', 'Q', 'K'].includes(pRankChar)) pRankChar = 'T';
            return `P${pRankChar}_${dRank}`;
        }
        const isSoft = playerHand.some(c => c.rank === 'A' && c.value === 11 && pValue !== playerHand.reduce((sum, card) => sum + (card.rank === 'A' ? 1 : card.value), 0) + (playerHand.filter(c=>c.rank === 'A').length * 10) );
        return isSoft ? `S${pValue}_${dRank}` : `H${pValue}_${dRank}`;
    }

    let currentBetUnits = { main: 0, split: 0 };

    function startNewHand() {
        if (shoe.length < (CURRENT_NUM_DECKS * 52 * RESHUFFLE_PENETRATION)) {
            messageEl.textContent = "Reshuffling the shoe..."; createShoe();
        } else { updateGameTitle(); }

        playerHand = []; dealerHand = []; playerSplitHand = [];
        isSplitHandActive = false;
        splitHandAreaEl.style.display = 'none';
        document.getElementById('player-cards').classList.remove('active-hand');
        document.getElementById('player-cards-split').classList.remove('active-hand');

        const tcForBetting = calculateTrueCount();
        currentBetUnits.main = getRecommendedBetUnits(tcForBetting);
        currentBetUnits.split = 0;
        // Note: stats.unitsBet is only incremented if the hand plays out, or on double/split.
        // Initial bet is conceptually placed, but unitsBet reflects actual wagers for played actions.

        dealCard(playerHand, true); dealCard(dealerHand, true);
        dealCard(playerHand, true); dealCard(dealerHand, false);

        renderHands(); updateScores(); updateShoeInfo();

        gamePhase = 'INPUT_GUESSES';
        messageEl.textContent = `Bet: ${currentBetUnits.main} unit(s). Enter RC (visible) & BS.`;
        rcFeedbackEl.textContent = ''; bsFeedbackEl.textContent = ''; deviationInfoEl.textContent = '';
        runningCountGuessInput.value = ''; strategyGuessInput.value = ''; runningCountGuessInput.focus();
        updateButtonStates(); updateLiveRcDisplay();

        const dealerUpCard = dealerHand.find(card => !card.hidden);
        if (dealerUpCard && dealerUpCard.rank === 'A') {
            const trueCount = calculateTrueCount(); // TC after initial deal
            const insuranceDeviation = DEVIATIONS_MULTI_DECK_H17["INSURANCE_A"];
            if (trueCount !== null && insuranceDeviation && trueCount >= insuranceDeviation.tcThreshold) {
                 deviationInfoEl.textContent = `Deviation Alert: ${insuranceDeviation.note} (TC: ${trueCount.toFixed(1)} >= ${insuranceDeviation.tcThreshold}). BS says No.`;
                 deviationInfoEl.className = 'feedback info';
            } else if (insuranceDeviation) { // Ensure insuranceDeviation exists to access tcThreshold
                 deviationInfoEl.textContent = `Dealer shows Ace. BS: No Insurance. (Take if TC >= ${insuranceDeviation.tcThreshold})`;
                 deviationInfoEl.className = 'feedback info';
            }
        }

        if (isBlackjack(playerHand) || isBlackjack(dealerHand)) {
            revealDealerHoleCard(); determineOutcome();
        }
    }

    function handleSubmitGuesses() {
        if (gamePhase !== 'INPUT_GUESSES') return;
        const rcGuess = parseInt(runningCountGuessInput.value);
        const bsGuess = strategyGuessInput.value.toUpperCase();

        if (rcGuess === runningCount) {
            rcFeedbackEl.textContent = `Correct! (Actual RC for visible cards: ${runningCount})`;
            rcFeedbackEl.className = 'feedback correct';
        } else {
            rcFeedbackEl.textContent = `Incorrect. Actual RC (visible cards) is ${runningCount}.`;
            rcFeedbackEl.className = 'feedback incorrect';
        }

        const dealerUpCard = dealerHand.find(card => !card.hidden);
        if (!dealerUpCard) return;
        const currentTrueCount = calculateTrueCount();
        const situationKey = getSituationKey(playerHand, dealerUpCard);
        const correctBS = getBasicStrategy(playerHand, dealerUpCard);
        let recommendedPlay = correctBS; let isDeviation = false; let deviationDetails = "";
        const deviationRule = DEVIATIONS_MULTI_DECK_H17[situationKey];
        let deviationNotePrefix = (CURRENT_NUM_DECKS !== 6 && deviationRule) ? "(Using 6D Deviations) " : "";

        if (deviationRule && currentTrueCount !== null) {
            let deviationApplies = false;
            if (deviationRule.condition === '>=') deviationApplies = currentTrueCount >= deviationRule.tcThreshold;
            else if (deviationRule.condition === '<=') deviationApplies = currentTrueCount <= deviationRule.tcThreshold;

            if (deviationApplies) {
                recommendedPlay = deviationRule.play; isDeviation = true;
                deviationDetails = `${deviationNotePrefix}Deviation: ${deviationRule.note} at TC ${currentTrueCount.toFixed(1)} (BS was ${correctBS}).`;
            } else {
                 deviationDetails = `${deviationNotePrefix}No current deviation for ${situationKey}. BS: ${correctBS}. (For ${situationKey}, dev. at TC ${deviationRule.condition} ${deviationRule.tcThreshold})`;
            }
        } else if (situationKey.startsWith("INSURANCE")) {
            recommendedPlay = 'N';
            const insRule = DEVIATIONS_MULTI_DECK_H17["INSURANCE_A"];
            if (insRule && currentTrueCount !== null && currentTrueCount >= insRule.tcThreshold) {
                recommendedPlay = 'Y'; isDeviation = true;
                deviationDetails = `${deviationNotePrefix}(Deviation: Take Insurance at TC ${currentTrueCount.toFixed(1)}. BS was N.)`;
            } else if (insRule) {
                deviationDetails = `${deviationNotePrefix}(BS for Insurance: N. Take if TC >= ${insRule.tcThreshold})`;
            }
            recommendedPlay = correctBS; isDeviation = false;
            if (dealerUpCard.rank === 'A') { bsFeedbackEl.innerHTML = `For Insurance: ${deviationDetails} <br>For Hand Action: `; }
            else { bsFeedbackEl.innerHTML = ""; }
        }

        if (bsGuess === recommendedPlay) {
            bsFeedbackEl.innerHTML += `Your play '${bsGuess}' is Correct! ${isDeviation ? 'DEVIATION.' : '(Basic Strategy)'} <br><small>${deviationDetails}</small>`;
            bsFeedbackEl.className = 'feedback correct';
        } else {
            bsFeedbackEl.innerHTML += `Your play '${bsGuess}' is Incorrect. Correct is '${recommendedPlay}'. ${isDeviation ? 'DEVIATION.' : '(Basic Strategy)'} <br><small>${deviationDetails}</small> BS was ${correctBS}.`;
            bsFeedbackEl.className = 'feedback incorrect';
        }
        if (!deviationDetails && !situationKey.startsWith("INSURANCE")) {
             bsFeedbackEl.innerHTML += ` BS for ${CURRENT_NUM_DECKS}D is '${correctBS}'.`;
        }
        if (dealerUpCard.rank !== 'A' || situationKey !== "INSURANCE_A") { if (!isDeviation) deviationInfoEl.textContent = ''; }

        gamePhase = 'PLAYER_ACTION';
        messageEl.textContent = "Your turn. Choose an action."; updateButtonStates();
    }

    function playerHit() {
        if (gamePhase !== 'PLAYER_ACTION') return;
        const currentHand = isSplitHandActive ? playerSplitHand : playerHand;
        dealCard(currentHand, true);
        renderHands(); updateScores(); updateShoeInfo();

        const score = getHandValue(currentHand);
        if (score > 21) {
            messageEl.textContent = `Bust! ${isSplitHandActive ? "Split hand" : "Your hand"} value is ${score}.`;
            if (isSplitHandActive) {
                isSplitHandActive = false;
                if(playerHand.length > 0 && getHandValue(playerHand) <= 21) {
                    if (playerHand.length < 2) dealCard(playerHand, true);
                    renderHands(); updateScores(); updateShoeInfo();
                    document.getElementById('player-cards').classList.add('active-hand');
                    document.getElementById('player-cards-split').classList.remove('active-hand');
                    if (getHandValue(playerHand) === 21 || isBlackjack(playerHand)) { playerStand(); return; }
                    gamePhase = 'INPUT_GUESSES';
                    rcFeedbackEl.textContent = ''; bsFeedbackEl.textContent = ''; deviationInfoEl.textContent = ''; strategyGuessInput.value = '';
                    updateButtonStates(); return;
                } else { dealerTurn(); return; }
            } else { // Main hand busted
                if (playerSplitHand.length > 0 && getHandValue(playerSplitHand) <= 21) { playerStand(); return; } // Move to split
                else { endHand("Player busts."); return; }
            }
        } else if (score === 21) { playerStand(); }
        doubleBtn.disabled = true; splitBtn.disabled = true;
    }

    function playerStand() {
        if (gamePhase !== 'PLAYER_ACTION') return;
        deviationInfoEl.textContent = '';

        if (isSplitHandActive) {
            isSplitHandActive = false;
            if (playerHand.length > 0 && getHandValue(playerHand) <= 21) {
                if (playerHand.length < 2) dealCard(playerHand, true);
                renderHands(); updateScores(); updateShoeInfo();
                if (isBlackjack(playerHand) || getHandValue(playerHand) === 21) { dealerTurn(); return; }
                messageEl.textContent = "Playing main hand. Enter guesses.";
                document.getElementById('player-cards').classList.add('active-hand');
                document.getElementById('player-cards-split').classList.remove('active-hand');
                gamePhase = 'INPUT_GUESSES';
                rcFeedbackEl.textContent = ''; bsFeedbackEl.textContent = ''; strategyGuessInput.value = '';
                updateButtonStates(); return;
            } else { dealerTurn(); return; }
        } else if (playerSplitHand.length > 0 && getHandValue(playerSplitHand) <= 21) {
            const splitHandValue = getHandValue(playerSplitHand);
            if (playerSplitHand.length < 2 || (splitHandValue < 21 && !isBlackjack(playerSplitHand))) {
                isSplitHandActive = true;
                if (playerSplitHand.length < 2) dealCard(playerSplitHand, true);
                renderHands(); updateScores(); updateShoeInfo();
                if (isBlackjack(playerSplitHand) || getHandValue(playerSplitHand) === 21) { playerStand(); return; }
                messageEl.textContent = "Playing split hand. Enter guesses.";
                document.getElementById('player-cards-split').classList.add('active-hand');
                document.getElementById('player-cards').classList.remove('active-hand');
                gamePhase = 'INPUT_GUESSES';
                rcFeedbackEl.textContent = ''; bsFeedbackEl.textContent = ''; strategyGuessInput.value = '';
                updateButtonStates(); return;
            } else { dealerTurn(); return; }
        } else { dealerTurn(); }
    }

    function playerDouble() {
        if (gamePhase !== 'PLAYER_ACTION') return;
        const currentHandRef = isSplitHandActive ? playerSplitHand : playerHand;
        if (currentHandRef.length !== 2) return;

        let betToDouble = isSplitHandActive ? currentBetUnits.split : currentBetUnits.main;
        stats.unitsBet += betToDouble; // Add the original bet amount again for the double
        if (isSplitHandActive) currentBetUnits.split *= 2; else currentBetUnits.main *= 2;
        messageEl.textContent = `Doubled bet on ${isSplitHandActive ? 'split' : 'main'} hand to ${isSplitHandActive ? currentBetUnits.split : currentBetUnits.main} units.`;

        dealCard(currentHandRef, true);
        renderHands(); updateScores(); updateShoeInfo();

        const score = getHandValue(currentHandRef);
        if (score > 21) {
            const handName = isSplitHandActive ? "Split hand" : "Main hand";
            messageEl.textContent += ` Bust on double! ${handName} value is ${score}.`;
            if (isSplitHandActive) {
                isSplitHandActive = false;
                if (playerHand.length > 0 && getHandValue(playerHand) <= 21) {
                    if (playerHand.length < 2) dealCard(playerHand, true);
                    renderHands(); updateScores(); updateShoeInfo();
                    if (isBlackjack(playerHand) || getHandValue(playerHand) === 21) { dealerTurn(); return; }
                    messageEl.textContent += " Playing main hand.";
                    document.getElementById('player-cards').classList.add('active-hand');
                    document.getElementById('player-cards-split').classList.remove('active-hand');
                    gamePhase = 'INPUT_GUESSES'; updateButtonStates(); return;
                } else { dealerTurn(); return; }
            } else {
                if (playerSplitHand.length > 0 && getHandValue(playerSplitHand) <= 21) { playerStand(); return; }
                else { endHand("Player busts on double."); return; }
            }
        } else { playerStand(); }
    }

    function playerSplit() {
        if (gamePhase !== 'PLAYER_ACTION' || playerHand.length !== 2 || playerHand[0].rank !== playerHand[1].rank || playerSplitHand.length > 0) {
            messageEl.textContent = "Cannot split."; return;
        }
        // Use the original main hand bet for the new split hand. If main was already doubled, this logic is simpler.
        currentBetUnits.split = currentBetUnits.main / (doubleBtn.disabled ? 2 : 1); // if double already made, main bet is higher.
        if(doubleBtn.disabled && currentBetUnits.main > getRecommendedBetUnits(calculateTrueCount())) { // If main was doubled, split gets half
             currentBetUnits.split = currentBetUnits.main / 2;
        } else { // If main wasn't doubled, or split before double, split gets current recommended
             currentBetUnits.split = getRecommendedBetUnits(calculateTrueCount());
        }

        stats.unitsBet += currentBetUnits.split;

        playerSplitHand.push(playerHand.pop());
        splitHandAreaEl.style.display = 'block';
        dealCard(playerHand, true); dealCard(playerSplitHand, true);
        renderHands(); updateScores(); updateShoeInfo();

        isSplitHandActive = false;
        document.getElementById('player-cards').classList.add('active-hand');
        document.getElementById('player-cards-split').classList.remove('active-hand');
        messageEl.textContent = `Split successful. Bet ${currentBetUnits.split} on split. Playing first hand (main). Enter guesses.`;
        gamePhase = 'INPUT_GUESSES';
        rcFeedbackEl.textContent = ''; bsFeedbackEl.textContent = ''; deviationInfoEl.textContent = ''; strategyGuessInput.value = '';
        updateButtonStates();
    }

    function dealerTurn() {
        gamePhase = 'DEALER_ACTION';
        revealDealerHoleCard();
        updateButtonStates();
        messageEl.textContent = "Dealer's turn...";
        deviationInfoEl.textContent = '';

        const playerAllBusted = (getHandValue(playerHand) > 21 || playerHand.length === 0) && 
                                (playerSplitHand.length === 0 || getHandValue(playerSplitHand) > 21);
        if (playerAllBusted) { determineOutcome(); return; }
        
        const playerHasPlayableHand = (playerHand.length > 0 && getHandValue(playerHand) <= 21) || 
                                    (playerSplitHand.length > 0 && getHandValue(playerSplitHand) <= 21);
        if (!playerHasPlayableHand) { determineOutcome(); return; }

        setTimeout(() => {
            let dealerScore = getHandValue(dealerHand);
            while (dealerScore < 17 || (dealerScore === 17 && dealerHand.some(c => c.rank === 'A' && c.value === 11 && dealerScore !== dealerHand.reduce((sum, card) => sum + (card.rank === 'A' ? 1 : card.value), 0) + (dealerHand.filter(c=>c.rank === 'A').length * 10)))) {
                if (shoe.length === 0) break;
                dealCard(dealerHand, true);
                renderHands(); dealerScore = getHandValue(dealerHand); updateScores(); updateShoeInfo();
                if (dealerScore > 21) break;
            }
            determineOutcome();
        }, 1000);
    }
    
    function revealDealerHoleCard() {
        const holeCard = dealerHand.find(card => card.hidden);
        if (holeCard) {
            holeCard.hidden = false;
            runningCount += holeCard.countValue;
            updateShoeInfo(); updateLiveRcDisplay();
            renderHands(); updateScores();
        }
    }

    function determineOutcome() {
        gamePhase = 'HAND_OVER';
        if (dealerHand.some(c => c.hidden)) revealDealerHoleCard();
        
        // Increment hands played only if it wasn't a split hand that was already counted
        // A single hand (no split) or the start of a split counts as one.
        // If split occurred, one more hand outcome is processed.
        if(playerSplitHand.length === 0) stats.handsPlayed++;


        let finalMessage = ""; let handNetUnits = 0;

        // Initial bet for the round was conceptually placed.
        // If no double/split, unitsBet for the round is currentBetUnits.main
        // If hand didn't play (e.g. dealer BJ, player not BJ), unitsBet might need adjustment.
        // Simplified: we assume base bet for main hand is always 'at risk'.
        if (stats.unitsBet === 0 && currentBetUnits.main > 0) { // Ensure base bet counted if hand ends prematurely
             stats.unitsBet += currentBetUnits.main;
        }


        function getHandResultAndUpdateStats(pHand, dHand, handName, betForThisHand) {
            if (pHand.length === 0) return { msg: "", units: 0 };
            const pScore = getHandValue(pHand); const dScore = getHandValue(dHand);
            let resultMsg = `${handName}: `; let unitsChange = 0;

            if (pScore > 21) {
                resultMsg += `Bust (${pScore}). Dealer wins.`; stats.losses++; unitsChange = -betForThisHand;
            } else if (isBlackjack(pHand) && pHand.length === 2) {
                stats.blackjacks++;
                if (isBlackjack(dHand) && dHand.length === 2) {
                    resultMsg += `Blackjack! Push (${pScore}).`; stats.pushes++; unitsChange = 0;
                } else {
                    resultMsg += `Blackjack! Player wins 3:2! (${pScore}).`; stats.wins++; unitsChange = betForThisHand * 1.5;
                }
            } else if (dScore > 21) {
                resultMsg += `Player wins! Dealer busts (${dScore}). Your score: ${pScore}.`; stats.wins++; unitsChange = betForThisHand;
            } else if (pScore > dScore) {
                resultMsg += `Player wins! (${pScore} vs ${dScore}).`; stats.wins++; unitsChange = betForThisHand;
            } else if (dScore > pScore) {
                resultMsg += `Dealer wins. (${dScore} vs ${pScore}).`; stats.losses++; unitsChange = -betForThisHand;
            } else {
                resultMsg += `Push! (${pScore}).`; stats.pushes++; unitsChange = 0;
            }
            return { msg: resultMsg, units: unitsChange };
        }

        const mainHandOutcome = getHandResultAndUpdateStats(playerHand, dealerHand, "Main Hand", currentBetUnits.main);
        finalMessage = mainHandOutcome.msg;
        handNetUnits += mainHandOutcome.units;

        if (playerSplitHand.length > 0) {
            stats.handsPlayed++; // Count the resolution of the split hand
            const splitHandOutcome = getHandResultAndUpdateStats(playerSplitHand, dealerHand, "Split Hand", currentBetUnits.split);
            finalMessage += "<br>" + splitHandOutcome.msg;
            handNetUnits += splitHandOutcome.units;
        }
        
        stats.unitsNet += handNetUnits;
        messageEl.innerHTML = finalMessage + `<br>Hand Units: ${handNetUnits >= 0 ? '+' : ''}${handNetUnits.toFixed(1)}`;
        updateStatsAndEdgeDisplay(); updateButtonStates();
    }

    function endHand(reason) {
        gamePhase = 'HAND_OVER';
        if (dealerHand.some(c => c.hidden)) revealDealerHoleCard();
        messageEl.textContent = reason;
        // If hand ends prematurely (e.g. player bust before dealer plays fully), still update stats
        // This is tricky as determineOutcome normally handles final stats.
        // For simplicity, if 'reason' implies a loss, we'll count it, but bet might not be fully resolved.
        // Let determineOutcome handle the final stat update based on played hands.
        updateButtonStates();
    }

    function renderHands() {
        dealerCardsEl.innerHTML = dealerHand.map(card => `<div class="card ${card.hidden ? 'hidden' : ''}">${card.hidden ? '??' : card.display}</div>`).join('');
        playerCardsEl.innerHTML = playerHand.map(card => `<div class="card">${card.display}</div>`).join('');
        if (playerSplitHand.length > 0) {
            playerSplitCardsEl.innerHTML = playerSplitHand.map(card => `<div class="card">${card.display}</div>`).join('');
        } else { playerSplitCardsEl.innerHTML = ''; }
    }

    function updateScores() {
        dealerScoreEl.textContent = getHandValue(dealerHand);
        playerScoreEl.textContent = getHandValue(playerHand);
        if (playerSplitHand.length > 0) { playerSplitScoreEl.textContent = getHandValue(playerSplitHand); }
        else { playerSplitScoreEl.textContent = '0'; }
    }
    
    function updateButtonStates() {
        const currentProcessingHand = isSplitHandActive ? playerSplitHand : playerHand;
        const canSplit = playerHand.length === 2 && playerHand[0].rank === playerHand[1].rank && playerSplitHand.length === 0 && !isSplitHandActive;
        const canDouble = currentProcessingHand && currentProcessingHand.length === 2;

        hitBtn.disabled = gamePhase !== 'PLAYER_ACTION';
        standBtn.disabled = gamePhase !== 'PLAYER_ACTION';
        doubleBtn.disabled = gamePhase !== 'PLAYER_ACTION' || !canDouble;
        splitBtn.disabled = gamePhase !== 'PLAYER_ACTION' || !canSplit;
        submitGuessesBtn.disabled = gamePhase !== 'INPUT_GUESSES';

        if (gamePhase === 'HAND_OVER' || gamePhase === 'INIT') {
            nextHandBtn.disabled = false;
            deckSelectEl.disabled = false; // Enable deck selection when hand is over or at init
        } else {
            nextHandBtn.disabled = true;
            deckSelectEl.disabled = true; // Disable deck selection during active play
        }

        if (playerSplitHand.length > 0 && (gamePhase === 'PLAYER_ACTION' || gamePhase === 'INPUT_GUESSES')) {
            if (isSplitHandActive) {
                document.getElementById('player-cards-split').classList.add('active-hand');
                document.getElementById('player-cards').classList.remove('active-hand');
            } else {
                document.getElementById('player-cards').classList.add('active-hand');
                document.getElementById('player-cards-split').classList.remove('active-hand');
            }
        } else {
            document.getElementById('player-cards').classList.remove('active-hand');
            document.getElementById('player-cards-split').classList.remove('active-hand');
        }
    }

    function updateGameTitle() {
        gameTitleEl.textContent = `Blackjack Trainer (${CURRENT_NUM_DECKS} Deck${CURRENT_NUM_DECKS > 1 ? 's' : ''}, H17)`;
    }

    deckSelectEl.addEventListener('change', (event) => {
        CURRENT_NUM_DECKS = parseInt(event.target.value);
        console.log(`Decks: ${CURRENT_NUM_DECKS}`);
        gamePhase = 'INIT'; 
        resetPlayerStats();
        createShoe(); 
        updateShoeInfo(); 
        playerHand = []; dealerHand = []; playerSplitHand = []; // Clear hands for new shoe size
        renderHands(); updateScores(); // Update display
        rcFeedbackEl.textContent = ''; bsFeedbackEl.textContent = ''; deviationInfoEl.textContent = '';
        runningCountGuessInput.value = ''; strategyGuessInput.value = '';
        messageEl.textContent = `Shoe size changed to ${CURRENT_NUM_DECKS} deck(s). Reshuffling... Click "Next Hand".`;
        updateButtonStates(); 
    });
    
    resetStatsBtn.addEventListener('click', resetPlayerStats);

    function updateStatsAndEdgeDisplay() {
        statHandsPlayedEl.textContent = stats.handsPlayed;
        statWinsEl.textContent = stats.wins;
        statLossesEl.textContent = stats.losses;
        statPushesEl.textContent = stats.pushes;
        statBlackjacksEl.textContent = stats.blackjacks;

        if (stats.handsPlayed > 0) {
            statWinPctEl.textContent = ((stats.wins / stats.handsPlayed) * 100).toFixed(1);
            statLossPctEl.textContent = ((stats.losses / stats.handsPlayed) * 100).toFixed(1);
            statPushPctEl.textContent = ((stats.pushes / stats.handsPlayed) * 100).toFixed(1);
        } else {
            statWinPctEl.textContent = '0.0'; statLossPctEl.textContent = '0.0'; statPushPctEl.textContent = '0.0';
        }
        statUnitsNetEl.textContent = `${stats.unitsNet >= 0 ? '+' : ''}${stats.unitsNet.toFixed(1)}`;

        const currentTC = calculateTrueCount();
        trueCountValueMainEl.textContent = currentTC === null ? "N/A" : currentTC.toFixed(2);

        if (currentTC !== null) {
            const edge = (currentTC - 1) * 0.5;
            perceivedEdgeEl.textContent = `~${edge.toFixed(2)}`;
            recommendedBetEl.textContent = getRecommendedBetUnits(currentTC);
        } else {
            perceivedEdgeEl.textContent = "~N/A"; recommendedBetEl.textContent = "1";
        }
    }

    function getRecommendedBetUnits(trueCount) {
        if (trueCount === null || trueCount < 1) return 1;
        if (trueCount >= 6) return 6; if (trueCount >= 5) return 5;
        if (trueCount >= 4) return 4; if (trueCount >= 3) return 3;
        if (trueCount >= 2) return 2;
        return 1;
    }

    function resetPlayerStats() {
        stats = {
            handsPlayed: 0, wins: 0, losses: 0, pushes: 0,
            blackjacks: 0, unitsBet: 0, unitsNet: 0,
        };
        updateStatsAndEdgeDisplay();
        messageEl.textContent = "Player stats reset. Select shoe size and start new hand.";
        console.log("Player stats reset.");
    }

    nextHandBtn.addEventListener('click', startNewHand);
    submitGuessesBtn.addEventListener('click', handleSubmitGuesses);
    hitBtn.addEventListener('click', playerHit);
    standBtn.addEventListener('click', playerStand);
    doubleBtn.addEventListener('click', playerDouble);
    splitBtn.addEventListener('click', playerSplit);

    // Initial setup
    CURRENT_NUM_DECKS = parseInt(deckSelectEl.value);
    createShoe();
    updateStatsAndEdgeDisplay();
    updateButtonStates(); // Call after gamePhase is INIT
    updateLiveRcDisplay();
    messageEl.textContent = `Welcome! ${CURRENT_NUM_DECKS}-Deck H17. Select shoe size (if desired), then click "Next Hand" to start.`;
});
