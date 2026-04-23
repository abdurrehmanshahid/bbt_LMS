import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';

@Injectable()
export class KeysService {
  readonly privateKey: string;
  readonly publicKey: string;

  constructor(configService: ConfigService) {
    const envPrivate = configService.get<string>('JWT_PRIVATE_KEY_PEM');
    const envPublic = configService.get<string>('JWT_PUBLIC_KEY_PEM');

    if (envPrivate && envPublic) {
      // Env vars store newlines as literal \n — restore them
      this.privateKey = envPrivate.replace(/\\n/g, '\n');
      this.publicKey = envPublic.replace(/\\n/g, '\n');
    } else {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }
  }
}
