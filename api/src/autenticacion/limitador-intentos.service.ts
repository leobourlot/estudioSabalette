import { Injectable } from '@nestjs/common';
import { normalizeEmail } from '../usuarios/validadores/normalizar.js';

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS_PER_IP_AND_EMAIL = 5;
const MAX_ATTEMPTS_PER_IP = 30;

interface Counter {
  count: number;
  windowStart: number;
}

/**
 * Límite de intentos de ingreso (RF-10), en memoria. Ventana fija de 15 minutos desde el
 * primer intento contado; los intentos rechazados no se cuentan ni corren la ventana.
 * Supone una sola instancia de la API (ver plan 001).
 */
@Injectable()
export class LoginAttemptLimiter {
  private readonly counters = new Map<string, Counter>();

  /**
   * Si la IP o la combinación IP + email ya agotaron su límite, devuelve false sin contar.
   * Si no, cuenta el intento (exitoso o fallido) y devuelve true.
   */
  consumeAttempt(ip: string, email: string): boolean {
    const now = Date.now();
    this.forgetExpired(now);

    const ipKey = `ip:${ip}`;
    const ipAndEmailKey = `ip-email:${ip}|${normalizeEmail(email)}`;

    if (
      this.hasReachedLimit(ipKey, MAX_ATTEMPTS_PER_IP) ||
      this.hasReachedLimit(ipAndEmailKey, MAX_ATTEMPTS_PER_IP_AND_EMAIL)
    ) {
      return false;
    }

    this.count(ipKey, now);
    this.count(ipAndEmailKey, now);
    return true;
  }

  /** Cantidad de claves en memoria; solo para verificar la limpieza. */
  get trackedKeys(): number {
    return this.counters.size;
  }

  private hasReachedLimit(key: string, limit: number): boolean {
    const counter = this.counters.get(key);
    return counter !== undefined && counter.count >= limit;
  }

  private count(key: string, now: number): void {
    const counter = this.counters.get(key);
    if (counter) {
      counter.count++;
    } else {
      this.counters.set(key, { count: 1, windowStart: now });
    }
  }

  private forgetExpired(now: number): void {
    for (const [key, counter] of this.counters) {
      if (now - counter.windowStart >= WINDOW_MS) this.counters.delete(key);
    }
  }
}
