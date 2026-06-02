import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type AdminProfileRow = {
  id: string;
  username: string;
  full_name: string;
};

@Injectable()
export class AdminProfilesService implements OnModuleInit {
  constructor(
    @Inject('USER_KAFKA_SERVICE') private readonly userKafka: ClientKafka,
  ) {}

  onModuleInit(): void {
    this.userKafka.subscribeToResponseOf('user.lookup_profiles');
  }

  async lookup(ids: string[]): Promise<Map<string, AdminProfileRow>> {
    const unique = [
      ...new Set(ids.map((x) => `${x}`.trim()).filter(Boolean)),
    ].slice(0, 200);
    const map = new Map<string, AdminProfileRow>();
    if (unique.length === 0) return map;

    try {
      const res = (await firstValueFrom(
        this.userKafka.send('user.lookup_profiles', { ids: unique }).pipe(
          catchError((err) => {
            console.error('user.lookup_profiles failed', err);
            return of({ message: 'err', data: [] as AdminProfileRow[] });
          }),
        ),
      )) as { data?: AdminProfileRow[] };

      for (const row of res.data ?? []) {
        if (!row?.id) continue;
        map.set(row.id, {
          id: row.id,
          username: row.username ?? '',
          full_name: row.full_name ?? '',
        });
      }
    } catch (e) {
      console.error('AdminProfilesService.lookup', e);
    }

    return map;
  }
}
