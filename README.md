# Blackjack Strategy & Count Trainer

This is a web-based Blackjack simulator designed to help users practice and improve their card counting (Hi-Lo system) and basic strategy skills. The game uses a 6-deck shoe and standard Blackjack rules (Dealer Hits on Soft 17).

## Features

*   **6-Deck Shoe:** Simulates a realistic casino shoe with 6 standard 52-card decks.
*   **Hi-Lo Running Count:** The game internally tracks the running count.
*   **User Guesses:**
    *   **Running Count Guess:** After the initial deal, users must input their calculated running count.
    *   **Basic Strategy Guess:** Users must input the correct basic strategy play (H, S, D, P) for their hand against the dealer's up-card.
*   **Instant Feedback:** The trainer provides immediate feedback on the accuracy of both the running count and basic strategy guesses.
*   **Core Blackjack Actions:**
    *   Hit
    *   Stand
    *   Double Down (available on first two cards of a hand)
    *   Split (available on pairs, can split once)
*   **Dealer Rules:** Dealer Hits on Soft 17 (H17).
*   **Blackjack Payout:** Player Blackjack pays 3:2.
*   **Shoe Penetration & Reshuffle:** The shoe is automatically reshuffled when approximately 75% of the cards have been dealt (configurable in `script.js`), and the running count resets.
*   **True Count Display (Optional):** A toggleable display shows the current True Count for reference, calculated as `Running Count / Decks Remaining`.
*   **Clear UI:** Simple and functional interface to focus on training.

## Technologies Used

*   **HTML:** Structure of the web page.
*   **CSS:** Styling for a clean and usable interface.
*   **JavaScript (Vanilla):** All game logic, card handling, counting, strategy evaluation, and DOM manipulation. No external libraries or frameworks are used.

## How to Run

1.  Clone this repository or download the `index.html`, `style.css`, and `script.js` files.
2.  Ensure all three files are in the same directory.
3.  Open `index.html` in any modern web browser (e.g., Chrome, Firefox, Edge, Safari).

## How to Play & Train

1.  **Start:** Click the "Next Hand" button to deal a new hand.
2.  **Initial Deal:**
    *   Player receives two cards face up.
    *   Dealer receives one card face up and one card face down (hole card).
3.  **Count & Strategy Input:**
    *   **Running Count Guess:** Based on all cards seen *so far in the current round* (player's two cards, dealer's up card), calculate the Hi-Lo running count. Enter your guess in the "Your Running Count Guess" field.
        *   **Hi-Lo Values:**
            *   Cards 2-6: +1
            *   Cards 7-9: 0
            *   Cards 10, J, Q, K, A: -1
    *   **Basic Strategy Play Guess:** Determine the correct basic strategy play (H, S, D, P) for your current hand against the dealer's visible up-card. Enter your guess (e.g., 'H' for Hit) in the "Your Basic Strategy Play" field.
4.  **Submit Guesses:** Click the "Submit Guesses" button.
5.  **Feedback:**
    *   You will receive feedback on whether your running count guess was correct and what the actual running count is.
    *   You will receive feedback on whether your basic strategy guess was correct and what the chart-perfect play is.
6.  **Player's Turn:**
    *   The action buttons (Hit, Stand, Double, Split) will become active.
    *   Make your play based on basic strategy (or what you want to test). The game will allow any valid play, but the initial feedback helps you learn the correct one.
    *   If you split, you will play each hand separately, and you'll be prompted for basic strategy guesses for each new two-card hand formed after the split.
7.  **Dealer's Turn:**
    *   Once the player stands or busts (or doubles), the dealer reveals their hole card.
    *   The dealer's hole card value is added to the running count *at this point*.
    *   The dealer plays according to H17 rules (hits until 17 or more, hitting on soft 17).
8.  **Outcome:** The result of the hand (Player Wins, Dealer Wins, Push, Blackjack) is displayed.
9.  **Continue:** Click "Next Hand" to play another round.
10. **Shoe Info:** Keep an eye on "Cards Remaining" and "Decks Remaining" to understand shoe penetration. The running count resets to 0 when the shoe is reshuffled.

## Learning Objectives

*   **Master Hi-Lo Card Counting:** Accurately maintain a running count throughout multiple hands and a shoe.
*   **Memorize Basic Strategy:** Learn and internalize the correct basic strategy plays for all player hand vs. dealer up-card situations for a 6-deck, H17 game.
*   **Understand True Count (Optional):** Observe how the True Count changes with the Running Count and deck penetration. (True Count is generally used for betting decisions, which are not part of this trainer's core focus).

## Limitations & Potential Future Improvements

*   **Splitting:** Currently allows splitting once. Re-splitting pairs (other than Aces) or Aces is not implemented due to UI/logic complexity. Doubling after split (DAS) is allowed.
*   **Surrender:** Not implemented.
*   **Insurance:** Not implemented.
*   **Betting:** No betting simulation. The focus is purely on count and strategy decisions.
*   **Card Graphics:** Uses text representation for cards. Could be enhanced with graphical cards.
*   **Advanced Strategy Deviations:** Does not incorporate index plays (deviations from basic strategy based on true count).

---

Happy Training!
