import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KeywordRow } from '../auth/data-access/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  private objetiveUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-objetive';
  private methodologyUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/methodology-structure';
  private researchQuestionsUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/research-questions';
  private generateKeywordsUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-keywords';
  private searchStringUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-search-string';
  private criteriaUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-criteria';

  constructor(private http: HttpClient) { }

  getSuggestionFromChatGPT(
    title: string,
    methodology: string,
    description: string
  ): Observable<any> {
    return this.http.post<any>(this.objetiveUrl, { title, methodology, description });
  }

  getMethodologyStructure(
    title: string, 
    methodology: string, 
    objective: string
  ): Observable<any> {
    return this.http.post<any>(this.methodologyUrl, { title, methodology, objective });
  }

  getResearchQuestions(
    title: string,
    methodology: string,
    objective: string,
    numQuestions: number
  ): Observable<any> {
    return this.http.post<any>(this.researchQuestionsUrl, { title, methodology, objective, numQuestions });
  }

  generateKeywords(methodologyData: any): Observable<any> {
    return this.http.post<any>(this.generateKeywordsUrl, { methodologyData });
  }

  getSearchString(keywords: KeywordRow[]): Observable<any> {
    const transformedKeywords = keywords.map(item => {
      const metodologiaLimpia = item.related.replace(/\s*\(.*?\)/, "").trim();
      return {
        palabra_clave: item.keyword,
        metodologia: metodologiaLimpia,
        sinonimos: item.synonyms.split(',').map(s => s.trim())
      };
    });
  
    return this.http.post<any>(this.searchStringUrl, { keywords: transformedKeywords });
  }

  generateCriteria(title: string, objective: string): Observable<any> {
    
    return this.http.post<any>(this.criteriaUrl, { title, objective });
  }
}