/**
 * Glicko-2 Rating System
 * Implementation based on http://www.glicko.net/glicko/glicko2.pdf
 */

import { Injectable, Logger } from '@nestjs/common';

export interface GlickoRating {
  rating: number; // r (rating)
  rd: number; // RD (rating deviation)
  volatility: number; // σ (sigma)
}

export interface GameResult {
  opponentRating: number;
  opponentRD: number;
  result: number; // 1 = win, 0.5 = draw, 0 = loss
}

@Injectable()
export class Glicko2Service {
  private readonly logger = new Logger(Glicko2Service.name);

  // System constant (constrains volatility over time)
  private readonly TAU = 0.5;

  // Glicko-2 scale conversion constant
  private readonly SCALE = 173.7178;

  /**
   * Convert Glicko rating to Glicko-2 scale
   */
  private toGlicko2Scale(rating: number): number {
    return (rating - 1500) / this.SCALE;
  }

  /**
   * Convert Glicko-2 scale to Glicko rating
   */
  private toGlickoScale(mu: number): number {
    return mu * this.SCALE + 1500;
  }

  /**
   * Convert RD to Glicko-2 scale
   */
  private rdToGlicko2Scale(rd: number): number {
    return rd / this.SCALE;
  }

  /**
   * Convert Glicko-2 scale RD to Glicko RD
   */
  private rdToGlickoScale(phi: number): number {
    return phi * this.SCALE;
  }

  /**
   * g function (equation 3 in the paper)
   */
  private g(phi: number): number {
    return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
  }

  /**
   * E function (equation 4 in the paper)
   */
  private E(mu: number, muJ: number, phiJ: number): number {
    return 1 / (1 + Math.exp(-this.g(phiJ) * (mu - muJ)));
  }

  /**
   * v function (equation 5 in the paper)
   */
  private v(
    mu: number,
    results: Array<{ muJ: number; phiJ: number }>,
  ): number {
    let sum = 0;
    for (const result of results) {
      const gPhi = this.g(result.phiJ);
      const e = this.E(mu, result.muJ, result.phiJ);
      sum += gPhi * gPhi * e * (1 - e);
    }
    return 1 / sum;
  }

  /**
   * Delta function (equation 6 in the paper)
   */
  private delta(
    mu: number,
    v: number,
    results: Array<{ muJ: number; phiJ: number; s: number }>,
  ): number {
    let sum = 0;
    for (const result of results) {
      const gPhi = this.g(result.phiJ);
      const e = this.E(mu, result.muJ, result.phiJ);
      sum += gPhi * (result.s - e);
    }
    return v * sum;
  }

  /**
   * f function for Illinois algorithm (equation 10 in the paper)
   */
  private f(
    x: number,
    delta: number,
    phi: number,
    v: number,
    a: number,
  ): number {
    const ex = Math.exp(x);
    const phi2 = phi * phi;
    const part1 = (ex * (delta * delta - phi2 - v - ex)) / (2 * (phi2 + v + ex) * (phi2 + v + ex));
    const part2 = (x - a) / (this.TAU * this.TAU);
    return part1 - part2;
  }

  /**
   * Calculate new volatility using Illinois algorithm
   */
  private calculateNewVolatility(
    sigma: number,
    phi: number,
    v: number,
    delta: number,
  ): number {
    const a = Math.log(sigma * sigma);
    let A = a;
    let B: number;

    // Initialize B
    if (delta * delta > phi * phi + v) {
      B = Math.log(delta * delta - phi * phi - v);
    } else {
      let k = 1;
      while (this.f(a - k * this.TAU, delta, phi, v, a) < 0) {
        k++;
      }
      B = a - k * this.TAU;
    }

    // Illinois algorithm
    let fA = this.f(A, delta, phi, v, a);
    let fB = this.f(B, delta, phi, v, a);

    const CONVERGENCE_TOLERANCE = 0.000001;
    let iterations = 0;
    const MAX_ITERATIONS = 100;

    while (Math.abs(B - A) > CONVERGENCE_TOLERANCE && iterations < MAX_ITERATIONS) {
      const C = A + ((A - B) * fA) / (fB - fA);
      const fC = this.f(C, delta, phi, v, a);

      if (fC * fB < 0) {
        A = B;
        fA = fB;
      } else {
        fA = fA / 2;
      }

      B = C;
      fB = fC;
      iterations++;
    }

    return Math.exp(A / 2);
  }

  /**
   * Calculate new rating after games
   */
  calculateNewRating(
    player: GlickoRating,
    results: GameResult[],
  ): GlickoRating {
    // If no games played, increase RD
    if (results.length === 0) {
      const phi = this.rdToGlicko2Scale(player.rd);
      const newPhi = Math.sqrt(phi * phi + player.volatility * player.volatility);
      const newRD = this.rdToGlickoScale(newPhi);

      return {
        rating: player.rating,
        rd: newRD,
        volatility: player.volatility,
      };
    }

    // Step 2: Convert to Glicko-2 scale
    const mu = this.toGlicko2Scale(player.rating);
    const phi = this.rdToGlicko2Scale(player.rd);
    const sigma = player.volatility;

    // Step 3: Convert opponent ratings
    const opponents = results.map((r) => ({
      muJ: this.toGlicko2Scale(r.opponentRating),
      phiJ: this.rdToGlicko2Scale(r.opponentRD),
      s: r.result,
    }));

    // Step 4: Compute v
    const vValue = this.v(mu, opponents);

    // Step 5: Compute delta
    const deltaValue = this.delta(mu, vValue, opponents);

    // Step 6: Compute new volatility
    const newSigma = this.calculateNewVolatility(
      sigma,
      phi,
      vValue,
      deltaValue,
    );

    // Step 7: Update rating and RD
    const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

    const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / vValue);

    let muPrime = mu;
    for (const opponent of opponents) {
      const gPhi = this.g(opponent.phiJ);
      const e = this.E(mu, opponent.muJ, opponent.phiJ);
      muPrime += phiPrime * phiPrime * gPhi * (opponent.s - e);
    }

    // Step 8: Convert back to Glicko scale
    const newRating = this.toGlickoScale(muPrime);
    const newRD = this.rdToGlickoScale(phiPrime);

    return {
      rating: Math.round(newRating),
      rd: Math.round(newRD * 100) / 100,
      volatility: Math.round(newSigma * 1000000) / 1000000,
    };
  }

  /**
   * Calculate rating change for a single game
   */
  calculateSingleGame(
    player: GlickoRating,
    opponent: GlickoRating,
    result: number,
  ): GlickoRating {
    return this.calculateNewRating(player, [
      {
        opponentRating: opponent.rating,
        opponentRD: opponent.rd,
        result,
      },
    ]);
  }

  /**
   * Estimate win probability
   */
  calculateWinProbability(
    playerRating: number,
    opponentRating: number,
    opponentRD: number = 350,
  ): number {
    const mu = this.toGlicko2Scale(playerRating);
    const muJ = this.toGlicko2Scale(opponentRating);
    const phiJ = this.rdToGlicko2Scale(opponentRD);

    return this.E(mu, muJ, phiJ);
  }

  /**
   * Calculate rating change preview (before game)
   */
  calculateRatingChangePreview(
    player: GlickoRating,
    opponent: GlickoRating,
  ): {
    win: number;
    draw: number;
    loss: number;
  } {
    const winResult = this.calculateSingleGame(player, opponent, 1);
    const drawResult = this.calculateSingleGame(player, opponent, 0.5);
    const lossResult = this.calculateSingleGame(player, opponent, 0);

    return {
      win: winResult.rating - player.rating,
      draw: drawResult.rating - player.rating,
      loss: lossResult.rating - player.rating,
    };
  }

  /**
   * Get default rating for new player
   */
  getDefaultRating(): GlickoRating {
    return {
      rating: 1500,
      rd: 350,
      volatility: 0.06,
    };
  }

  /**
   * Check if rating is provisional (high RD)
   */
  isProvisional(rd: number): boolean {
    return rd > 110; // Lichess uses 110 as threshold
  }
}
