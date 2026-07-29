import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamingProvider } from './streaming-provider.interface';
import { InternetArchiveProvider } from './internet-archive.provider';

@Injectable()
export class ProviderFactory {
  private providers: Map<string, StreamingProvider> = new Map();

  constructor(private configService: ConfigService) {
    // Register all available providers
    const archiveProvider = new InternetArchiveProvider();
    this.providers.set(archiveProvider.name, archiveProvider);
  }

  getProvider(): StreamingProvider {
    const providerName = this.configService.get<string>('STREAMING_PROVIDER') ?? 'internet_archive';
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Unknown streaming provider: ${providerName}. Available: ${[...this.providers.keys()].join(', ')}`);
    }

    return provider;
  }

  getProviderByName(name: string): StreamingProvider | undefined {
    return this.providers.get(name);
  }

  getAvailableProviders(): string[] {
    return [...this.providers.keys()];
  }
}
