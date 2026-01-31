import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Platform } from '../../shared/models/platform.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {

  private readonly apiUrl = `${environment.apiUrl}/platforms`;

  constructor(private readonly http: HttpClient) { }

  getPlatforms(): Observable<Platform[]> {
    return this.http.get<Platform[]>(this.apiUrl);
  }
}
