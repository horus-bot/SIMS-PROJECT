export class Kalman2D {
    // State vector [x, y, vx, vy]
    x: number[];
    // Covariance matrix P (4x4)
    P: number[][];
    // Process noise Q (4x4)
    Q: number[][];
    // Measurement noise R (2x2)
    R: number[][];
    // Measurement matrix H (2x4)
    H: number[][];
  
    constructor(initialX = 0, initialY = 0) {
      this.x = [initialX, initialY, 0, 0];
      
      // Initial uncertainty
      this.P = [
        [100, 0, 0, 0],
        [0, 100, 0, 0],
        [0, 0, 100, 0],
        [0, 0, 0, 100]
      ];
  
      // Process noise (Q) - Tunable
      // Controls how much we trust the "physics" (velocity model) vs change
      this.Q = [
        [2, 0, 0, 0],
        [0, 2, 0, 0],
        [0, 0, 12, 0],
        [0, 0, 0, 12]
      ];
  
      // Measurement noise (R) - Tunable
      // Controls how much we trust the raw PDR inputs (jittery)
      // Higher = smoother but more lag. Lower = closer to raw input.
      this.R = [
        [60, 0],
        [0, 60]
      ];
  
      // Measurement function: we measure position (x, y)
      this.H = [
        [1, 0, 0, 0],
        [0, 1, 0, 0]
      ];
    }
  
    setState(x: number, y: number) {
      this.x = [x, y, 0, 0];
      // Reset uncertainty slightly to avoid getting "stuck" if we jump
      this.P = [
        [100, 0, 0, 0],
        [0, 100, 0, 0],
        [0, 0, 100, 0],
        [0, 0, 0, 100]
      ];
    }
  
    // Predict step: x = F*x
    predict(dt: number) {
      // F matrix (State Transition)
      // pos += vel * dt
      const F = [
        [1, 0, dt, 0],
        [0, 1, 0, dt],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ];
  
      // 1. Predict State: x = F * x
      const newX = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
              newX[i] += F[i][j] * this.x[j];
          }
      }
      this.x = newX;
  
      // 2. Predict Covariance: P = F * P * F^t + Q
      // A = F * P
      const A = this.multiply(F, this.P);
      // B = A * F^t
      const Ft = this.transpose(F);
      const B = this.multiply(A, Ft);
      
      // P = B + Q
      for(let i=0; i<4; i++) {
          for(let j=0; j<4; j++) {
              this.P[i][j] = B[i][j] + this.Q[i][j];
          }
      }
    }
  
    // Update step: correction with measurement z
    update(z_x: number, z_y: number) {
      const z = [z_x, z_y];
      
      // Innovation: y = z - H * x
      // H keeps only pos x,y
      const y = [z[0] - this.x[0], z[1] - this.x[1]];
  
      // Innovation Covariance: S = H * P * H^t + R
      // H * P * H^t reduces to just the top-left 2x2 of P
      const S = [
          [this.P[0][0] + this.R[0][0], this.P[0][1] + this.R[0][1]],
          [this.P[1][0] + this.R[1][0], this.P[1][1] + this.R[1][1]]
      ];
  
      // K = P * H^t * S^-1
      // P * H^t takes first 2 cols of P
      const PHt = [
          [this.P[0][0], this.P[0][1]],
          [this.P[1][0], this.P[1][1]],
          [this.P[2][0], this.P[2][1]],
          [this.P[3][0], this.P[3][1]]
      ];
  
      // Inverse S (2x2)
      const det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
      const invDet = 1 / (det || 0.0001); // avoid div/0
      const S_inv = [
          [S[1][1] * invDet, -S[0][1] * invDet],
          [-S[1][0] * invDet, S[0][0] * invDet]
      ];
  
      const K = this.multiply(PHt, S_inv);
  
      // Update State: x = x + K * y
      for(let i=0; i<4; i++) {
          this.x[i] += K[i][0] * y[0] + K[i][1] * y[1];
      }
  
      // Update Covariance: P = (I - K * H) * P
      // Compute K * H first. K is 4x2, H is 2x4.
      // KH will be 4x4.
      // Since H is [I|0], KH is just K padded with zeros.
      const KH = [
          [K[0][0], K[0][1], 0, 0],
          [K[1][0], K[1][1], 0, 0],
          [K[2][0], K[2][1], 0, 0],
          [K[3][0], K[3][1], 0, 0]
      ];
  
      const I_KH = [
          [1-KH[0][0], -KH[0][1], 0, 0],
          [-KH[1][0], 1-KH[1][1], 0, 0],
          [-KH[2][0], -KH[2][1], 1, 0],
          [-KH[3][0], -KH[3][1], 0, 1]
      ];
  
      this.P = this.multiply(I_KH, this.P);
    }
  
    get position() {
      return { x: this.x[0], y: this.x[1] };
    }
  
    // Helpers
    multiply(A: number[][], B: number[][]): number[][] {
      const rowsA = A.length;
      const colsA = A[0].length;
      const colsB = B[0].length;
      const result = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));
  
      for (let i = 0; i < rowsA; i++) {
        for (let j = 0; j < colsB; j++) {
          for (let k = 0; k < colsA; k++) {
            result[i][j] += A[i][k] * B[k][j];
          }
        }
      }
      return result;
    }
  
    transpose(A: number[][]): number[][] {
        return A[0].map((_, colIndex) => A.map(row => row[colIndex]));
    }
  }