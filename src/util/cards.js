const suits = ["S", "D", "C", "H"];
const values = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

//create deck
const getDeck = () => {
  let deck = [];
  suits.forEach((suit) => {
    values.forEach((val) => {
      deck.push(`${val} ${suit}`);
    });
  });
  return deck;
};

//perform fisher yates shuffle
const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    const currentCard = deck[i];
    const cardToSwap = deck[swapIndex];
    deck[i] = cardToSwap;
    deck[swapIndex] = currentCard;
  }
  return deck;
};

module.exports = { getDeck, shuffleDeck };
