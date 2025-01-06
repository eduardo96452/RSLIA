import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  private backendUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/chatgpt';

  constructor(private http: HttpClient) {}

  getSuggestionFromChatGPT(
    title: string,
    methodology: string,
    description: string
  ): Observable<any> {
    return this.http.post<any>(this.backendUrl, { title, methodology, description });
  }
}