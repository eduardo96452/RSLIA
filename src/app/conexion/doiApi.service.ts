import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DoiApiService {
  private crossRefApiUrl = 'https://api.crossref.org/works/';

  constructor(private http: HttpClient) {}

  fetchDoiData(doi: string): Observable<any> {
    const url = `${this.crossRefApiUrl}${encodeURIComponent(doi)}`;
    return this.http.get(url).pipe(map((res: any) => res.message));
  }
}