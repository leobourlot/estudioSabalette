import { createInterface, type Interface } from 'node:readline';
import { Writable } from 'node:stream';
import { NestFactory } from '@nestjs/core';
import { PrincipalAdminService } from './administrador-principal.service.js';
import { ConsoleModule } from './consola.module.js';

/**
 * Comando de consola del administrador principal (RF-41, RF-42).
 * Desarrollo: `pnpm --filter api admin:principal`.
 * Easypanel: `node dist/consola/administrador-principal.js` desde la consola del servicio.
 */

// La salida pasa por acá para poder silenciarla mientras se escribe una contraseña.
let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});

function ask(rl: Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function askPassword(rl: Interface, question: string): Promise<string> {
  process.stdout.write(question);
  muted = true;
  try {
    return await ask(rl, '');
  } finally {
    muted = false;
    process.stdout.write('\n');
  }
}

/** Pide la contraseña dos veces hasta que coincidan. */
async function askNewPassword(rl: Interface, label: string): Promise<string> {
  for (;;) {
    const password = await askPassword(rl, `${label}: `);
    const repeated = await askPassword(rl, 'Repetí la contraseña: ');
    if (password === repeated) return password;
    console.log('Las contraseñas no coinciden. Probá de nuevo.');
  }
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ConsoleModule, { logger: ['error'] });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  try {
    const service = app.get(PrincipalAdminService);
    const principal = await service.findPrincipal();

    if (!principal) {
      console.log('No hay administrador principal. Vamos a crearlo.');
      for (;;) {
        const data = {
          nombre: await ask(rl, 'Nombre: '),
          apellido: await ask(rl, 'Apellido: '),
          email: await ask(rl, 'Email: '),
          contrasena: await askNewPassword(
            rl,
            'Contraseña (10 a 64 caracteres, sin tildes, ñ ni emojis)',
          ),
        };
        try {
          const created = await service.createPrincipal(data);
          console.log(`Listo: ${created.email} es el administrador principal.`);
          return;
        } catch (error) {
          console.log(`No se pudo crear: ${(error as Error).message}. Probá de nuevo.`);
        }
      }
    }

    console.log(`El administrador principal es ${principal.email}.`);
    const answer = await ask(rl, '¿Querés restablecer su contraseña? (s/n): ');
    if (answer.trim().toLowerCase() !== 's') {
      console.log('No se hizo ningún cambio.');
      return;
    }
    for (;;) {
      const password = await askNewPassword(rl, 'Contraseña temporal');
      try {
        await service.resetPrincipalPassword(password);
        console.log('Listo: al ingresar va a tener que cambiarla.');
        return;
      } catch (error) {
        console.log(`No se pudo restablecer: ${(error as Error).message}. Probá de nuevo.`);
      }
    }
  } finally {
    rl.close();
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
