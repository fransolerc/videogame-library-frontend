import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Platform } from './platform.model';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {

  private apiUrl = `${environment.apiUrl}/platforms`;

  constructor(private http: HttpClient) { }

  getPlatforms(): Observable<Platform[]> {
    return this.http.get<Platform[]>(this.apiUrl);
  }
}
