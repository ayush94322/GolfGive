const supabase = require('../../config/supabase');
const logger = require('../../config/logger');

const JACKPOT_PCT = parseFloat(process.env.JACKPOT_TIER_PERCENT) || 0.40;
const FOUR_MATCH_PCT = parseFloat(process.env.FOUR_MATCH_TIER_PERCENT) || 0.35;
const THREE_MATCH_PCT = parseFloat(process.env.THREE_MATCH_TIER_PERCENT) || 0.25;

// ─── Generate 5 random numbers (1–45, unique) ─────────────────────────────────
const generateRandomNumbers = () => {
  const numbers = new Set();
  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1);
  }
  return [...numbers].sort((a, b) => a - b);
};

// ─── Algorithmic draw: weighted toward LEAST frequent scores ─────────────────
const generateAlgorithmicNumbers = (frequencyMap) => {
  // Invert frequency so rare scores get higher weight
  const weights = {};
  const maxFreq = Math.max(...Object.values(frequencyMap)) || 1;

  for (let i = 1; i <= 45; i++) {
    weights[i] = maxFreq - (frequencyMap[i] || 0) + 1;
  }

  const pool = [];
  for (const [num, weight] of Object.entries(weights)) {
    for (let w = 0; w < weight; w++) pool.push(parseInt(num));
  }

  // Fisher-Yates shuffle on pool, pick 5 unique
  const numbers = new Set();
  const shuffled = pool.sort(() => Math.random() - 0.5);
  for (const n of shuffled) {
    numbers.add(n);
    if (numbers.size === 5) break;
  }
  return [...numbers].sort((a, b) => a - b);
};

// ─── Calculate prize pool from current month's payments ──────────────────────
const calculatePrizePool = async (drawMonthStart, rolledOverAmount = 0) => {
  const nextMonth = new Date(drawMonthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const { data: payments } = await supabase
    .from('payment_history')
    .select('prize_pool_contribution')
    .gte('paid_at', drawMonthStart.toISOString())
    .lt('paid_at', nextMonth.toISOString())
    .eq('status', 'paid');

  const fromPayments = (payments || []).reduce(
    (sum, p) => sum + parseFloat(p.prize_pool_contribution || 0), 0
  );

  const total = fromPayments + rolledOverAmount;
  return {
    total: parseFloat(total.toFixed(2)),
    jackpot: parseFloat((total * JACKPOT_PCT).toFixed(2)),
    fourMatch: parseFloat((total * FOUR_MATCH_PCT).toFixed(2)),
    threeMatch: parseFloat((total * THREE_MATCH_PCT).toFixed(2)),
  };
};

// ─── Fetch eligible entries (active subscribers with 5 scores) ────────────────
const fetchEligibleEntries = async (drawId) => {
  // Get all active subscribers
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('user_id, id')
    .eq('status', 'active');

  if (!activeSubs?.length) return [];

  const userIds = activeSubs.map(s => s.user_id);
  const subMap = Object.fromEntries(activeSubs.map(s => [s.user_id, s.id]));

  // Get users who have exactly 5 scores
  const { data: scoreCounts } = await supabase
    .from('golf_scores')
    .select('user_id, score')
    .in('user_id', userIds)
    .order('played_at', { ascending: false });

  // Group scores per user
  const userScores = {};
  for (const row of scoreCounts || []) {
    if (!userScores[row.user_id]) userScores[row.user_id] = [];
    if (userScores[row.user_id].length < 5) {
      userScores[row.user_id].push(row.score);
    }
  }

  // Only include users with exactly 5 scores
  const eligible = [];
  for (const [userId, scores] of Object.entries(userScores)) {
    if (scores.length === 5) {
      eligible.push({ userId, subscriptionId: subMap[userId], scores });
    }
  }

  return eligible;
};

// ─── Count matches between user scores and winning numbers ───────────────────
const countMatches = (userScores, winningNumbers) => {
  const winSet = new Set(winningNumbers);
  return userScores.filter(s => winSet.has(s)).length;
};

const matchTypeFromCount = (count) => {
  if (count === 5) return 'five_match';
  if (count === 4) return 'four_match';
  if (count === 3) return 'three_match';
  return null;
};

// ─── SIMULATE DRAW (no DB write, preview only) ───────────────────────────────
exports.simulateDraw = async (drawId) => {
  const { data: draw } = await supabase
    .from('draws')
    .select('*')
    .eq('id', drawId)
    .single();

  if (!draw) throw new Error('Draw not found');

  let winningNumbers;
  if (draw.logic === 'algorithmic') {
    // Fetch frequency map
    const { data: scores } = await supabase.from('golf_scores').select('score');
    const freq = {};
    (scores || []).forEach(s => { freq[s.score] = (freq[s.score] || 0) + 1; });
    winningNumbers = generateAlgorithmicNumbers(freq);
  } else {
    winningNumbers = generateRandomNumbers();
  }

  const eligible = await fetchEligibleEntries(drawId);
  const results = { five_match: [], four_match: [], three_match: [], winningNumbers, totalEntries: eligible.length };

  for (const entry of eligible) {
    const matched = countMatches(entry.scores, winningNumbers);
    const type = matchTypeFromCount(matched);
    if (type) results[type].push({ userId: entry.userId, scores: entry.scores, matched });
  }

  const drawMonthDate = new Date(draw.draw_month);
  const pools = await calculatePrizePool(drawMonthDate, draw.rolled_over_amount || 0);

  return { ...results, pools };
};

// ─── RUN DRAW (writes to DB, assigns winners) ─────────────────────────────────
exports.runDraw = async (drawId, publish = false) => {
  const { data: draw } = await supabase
    .from('draws')
    .select('*')
    .eq('id', drawId)
    .single();

  if (!draw) throw new Error('Draw not found');
  if (draw.status === 'published') throw new Error('Draw already published');

  let winningNumbers;
  if (draw.logic === 'algorithmic') {
    const { data: scores } = await supabase.from('golf_scores').select('score');
    const freq = {};
    (scores || []).forEach(s => { freq[s.score] = (freq[s.score] || 0) + 1; });
    winningNumbers = generateAlgorithmicNumbers(freq);
  } else {
    winningNumbers = generateRandomNumbers();
  }

  const eligible = await fetchEligibleEntries(drawId);
  const drawMonthDate = new Date(draw.draw_month);
  const pools = await calculatePrizePool(drawMonthDate, draw.rolled_over_amount || 0);

  // Insert entries
  const entryInserts = eligible.map(e => ({
    draw_id: drawId,
    user_id: e.userId,
    subscription_id: e.subscriptionId,
    scores: e.scores,
    matched_count: 0,
    match_type: null,
  }));

  if (entryInserts.length > 0) {
    // Upsert to avoid duplicates on re-run
    await supabase.from('draw_entries').upsert(entryInserts, { onConflict: 'draw_id,user_id' });
  }

  // Evaluate matches
  const winners = { five_match: [], four_match: [], three_match: [] };

  for (const entry of eligible) {
    const matched = countMatches(entry.scores, winningNumbers);
    const type = matchTypeFromCount(matched);

    if (type) {
      // Update entry match
      await supabase.from('draw_entries')
        .update({ matched_count: matched, match_type: type })
        .eq('draw_id', drawId)
        .eq('user_id', entry.userId);

      winners[type].push({ userId: entry.userId, scores: entry.scores });
    }
  }

  // Calculate per-winner prize amounts
  const prizePerWinner = (pool, count) => count > 0 ? parseFloat((pool / count).toFixed(2)) : 0;

  const jackpotWinnerCount = winners.five_match.length;
  const jackpotRolledOver = jackpotWinnerCount === 0;
  const jackpotPrize = prizePerWinner(pools.jackpot, jackpotWinnerCount);
  const fourMatchPrize = prizePerWinner(pools.fourMatch, winners.four_match.length);
  const threeMatchPrize = prizePerWinner(pools.threeMatch, winners.three_match.length);

  // Insert winners if publishing
  const winnerInserts = [];
  if (publish) {
    // Get draw_entry ids
    const { data: entryRows } = await supabase
      .from('draw_entries')
      .select('id, user_id, match_type')
      .eq('draw_id', drawId)
      .not('match_type', 'is', null);

    const entryMap = Object.fromEntries(entryRows.map(e => [e.user_id, e.id]));

    for (const w of winners.five_match) {
      winnerInserts.push({ draw_id: drawId, draw_entry_id: entryMap[w.userId], user_id: w.userId, match_type: 'five_match', prize_amount: jackpotPrize });
    }
    for (const w of winners.four_match) {
      winnerInserts.push({ draw_id: drawId, draw_entry_id: entryMap[w.userId], user_id: w.userId, match_type: 'four_match', prize_amount: fourMatchPrize });
    }
    for (const w of winners.three_match) {
      winnerInserts.push({ draw_id: drawId, draw_entry_id: entryMap[w.userId], user_id: w.userId, match_type: 'three_match', prize_amount: threeMatchPrize });
    }

    if (winnerInserts.length > 0) {
      await supabase.from('winners').insert(winnerInserts);
    }

    // Notify winners
    for (const w of winnerInserts) {
      await supabase.from('notifications').insert({
        user_id: w.user_id,
        type: 'winner_alert',
        title: '🎉 You won the draw!',
        body: `Congratulations! You matched ${w.match_type.replace('_', ' ')} and won £${w.prize_amount}. Please upload your proof.`,
        meta: { draw_id: drawId, match_type: w.match_type, prize_amount: w.prize_amount },
      });
    }
  }

  // Update draw record
  const drawUpdate = {
    winning_numbers: winningNumbers,
    total_prize_pool: pools.total,
    jackpot_pool: pools.jackpot,
    four_match_pool: pools.fourMatch,
    three_match_pool: pools.threeMatch,
    jackpot_rolled_over: jackpotRolledOver,
    eligible_entries: eligible.length,
    status: publish ? 'published' : 'simulation',
    ...(publish ? { published_at: new Date().toISOString() } : { simulated_at: new Date().toISOString() }),
  };

  await supabase.from('draws').update(drawUpdate).eq('id', drawId);

  // Notify all subscribers of draw result
  if (publish) {
    const { data: allSubs } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active');

    const notifs = (allSubs || []).map(s => ({
      user_id: s.user_id,
      type: 'draw_result',
      title: 'Monthly Draw Results Published',
      body: `The draw for ${draw.draw_month} has been published. The winning numbers were: ${winningNumbers.join(', ')}.`,
      meta: { draw_id: drawId, winning_numbers: winningNumbers },
    }));

    if (notifs.length > 0) {
      await supabase.from('notifications').insert(notifs);
    }
  }

  logger.info(`Draw ${drawId} ${publish ? 'published' : 'simulated'}. Winners: J=${jackpotWinnerCount}, 4M=${winners.four_match.length}, 3M=${winners.three_match.length}`);

  return {
    winningNumbers,
    pools,
    winners: winnerInserts,
    jackpotRolledOver,
    totalEntries: eligible.length,
  };
};

module.exports = { simulateDraw: exports.simulateDraw, runDraw: exports.runDraw };
