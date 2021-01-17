require("dotenv").config();

const { getDeck, shuffleDeck, cardValue } = require("./cards");
const { redisClient } = require("../server");
const models = require("../models");

const deal = async (game, player) => {
  const cards = await drawCards(game, 2);
  await logMoves("deal", player, game, cards);
  return await getPlayerGameData(game, player);
};

const hit = async (game, player) => {
  const cards = await drawCards(game, 1);
  await logMoves("hit", player, game, cards);
  return await getPlayerGameData(game, player);
};

const stand = async (gameId, playerId) => {
  //get player points
  const playerGame = await getPlayerGameData(gameId, playerId);
  let dealerGame = await getPlayerGameData(gameId, process.env.DEALER);

  await dealerPlay(gameId, playerId);

  dealerGame = await getPlayerGameData(gameId, process.env.DEALER);
  await setGameStatus(gameId, dealerGame.points, playerGame.points);
  const game = await getGame(gameId);
  const data = await getPlayerGameData(gameId, process.env.DEALER);
  return { ...data, status: game.status };
};

const dealerPlay = async (game, player) => {
  console.log(
    "*******************************Run DEALER PLAY LOGIC***************************"
  );
  //recursive method to hit until dealer wins or busts
  const playerGame = await getPlayerGameData(game, player);
  const dealerGame = await getPlayerGameData(game, process.env.DEALER);
  if (dealerGame.points >= playerGame.points) {
    console.log(
      "*******************************END DEALER PLAY LOGIC***************************"
    );
    return;
  }
  await hit(game, process.env.DEALER);
  await dealerPlay(game, player);
};

const getGame = async (gameId) => {
  const game = await models.Game.findOne({
    where: { id: gameId },
    raw: true,
  });
  return game;
};

const setGameStatus = async (game, dealerPoints, playerPoints) => {
  let status;
  if (playerPoints > 21) {
    status = "lose";
  } else if (dealerPoints > 21) {
    status = "win";
  } else if (dealerPoints === playerPoints) {
    status = "draw";
  } else if (dealerPoints > playerPoints) {
    status = "lose";
  } else {
    status = "win";
  }

  const res = await models.Game.update(
    {
      status: status,
    },
    {
      where: { id: game },
      returning: true, // needed for affectedRows to be populated
      plain: true, // makes sure that the returned instances are just plain objects
    }
  );
  console.log(res);
  return res;
};

const setupGame = (gameId) => {
  //create deck and shuffle
  let deck = shuffleDeck(getDeck());
  //push deck to redis
  pushToRedis(gameId, deck);
};

const drawCards = async (gameId, count) => {
  // async function asyncRedisLPop(gameId) {
  //   return new Promise((resolve, reject) => {
  //     redisClient.lpop([gameId], (err, value) => {
  //       cards.push(value);
  //       console.log({ value, cards });
  //       resolve();
  //     });
  //   });
  // }
  console.log(gameId);
  let cards = [];
  for (let i = 0; i < count; i++) {
    const card = await redisClient.lpop([gameId]);
    cards.push(card);
  }
  console.log(cards);
  return cards;
};

const logMoves = async (action, user, game, data) => {
  const promises = data.map(async (card) => {
    const move = await models.Move.create({
      action: action,
      card: card,
      value: cardValue(card),
      userId: user,
      gameId: game,
    });
    return move;
  });
  const moves = await Promise.all(promises);
  return moves;
};

const getMoves = async (game, player) => {
  const moves = await models.Move.findAll({
    where: { gameId: game, userId: player },
    raw: true,
  });
  return moves;
};

const getCards = (moves) => {
  const cards = moves.map(function (move) {
    return move["card"];
  });
  return cards;
};

const calculatePoints = (moves) => {
  //sum all values minus aces
  let result = [];
  let sum = moves.reduce((tot, move) => {
    if (move.value !== -1) {
      return tot + move.value;
    }
    return tot;
  }, 0);

  //get all aces
  const aces = moves.filter((move) => move.value === -1);
  //if no  aces
  if (aces.length === 0) {
    result.push(sum);
  } else {
    //so if there is more than 1 ace, then only 1 of them can be 1 or 11. The rest will have to be 1s.
    //because two aces with higher value will result in 22, leading to a bust
    //first ace, can be 1 or 11
    //all other aces are 1s
    const a = sum + 1 + (aces.length - 1);
    const b = sum + 11 + (aces.length - 1);
    result.push(a);
    result.push(b);
  }

  return Math.max(...result);
};

const getPlayerGameData = async (game, player) => {
  const moves = await getMoves(game, player);
  const cards = getCards(moves);
  const points = calculatePoints(moves);

  return { game, player, cards, points };
};

const pushToRedis = (key, arr) => {
  arr.forEach((a) => {
    redisClient.lpush(key, a);
  });
};

module.exports = { setupGame, deal, hit, stand };
