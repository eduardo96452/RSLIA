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
  private dataExtractionQuestionsUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-data-extraction-questions';
  private introductionUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-introduction';


  constructor(private http: HttpClient) { }

  getSuggestionFromChatGPT(
    title: string,
    methodology: string,
    description: string,
    extraFields: any
  ): Observable<any> {
    // Construir el body antes de enviarlo
    const requestBody = {
      title,
      methodology,
      description,
      ...extraFields
    };
  
    // Agregar un console.log para ver qué datos enviamos
    //console.log('Enviando a /api/generate-objetive:', requestBody);
  
    // Ahora sí hacemos la petición HTTP
    return this.http.post<any>(this.objetiveUrl, requestBody);
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
    numQuestions: number,
    tipoInvestigacion: string
  ): Observable<any> {
    return this.http.post<any>(this.researchQuestionsUrl, {
      title,
      methodology,
      objective,
      numQuestions,
      tipoInvestigacion
    });
  }

  generateKeywords(methodologyData: any): Observable<any> {
    return this.http.post<any>(this.generateKeywordsUrl, { methodologyData });
  }

  getSearchString(keywords: KeywordRow[]): Observable<any> {
    const transformedKeywords = keywords.map(item => {
      const metodologiaLimpia = item.related && item.related.nombre 
        ? item.related.nombre.replace(/\s*\(.*?\)/, "").trim() 
        : '';
      return {
        palabra_clave: item.keyword,
        metodologia: metodologiaLimpia,
        sinonimos: Array.isArray(item.synonyms) ? item.synonyms.map(s => s.trim()) : []
      };
    });
    
    return this.http.post<any>(this.searchStringUrl, { keywords: transformedKeywords });
  }

  generateCriteria(title: string, objective: string): Observable<any> {
    
    return this.http.post<any>(this.criteriaUrl, { title, objective });
  }

  generateDataExtractionQuestions(
    title: string,
    objective: string,
    numberOfQuestions: number
  ): Observable<any> {
    const body = { title, objective, numberOfQuestions };
    return this.http.post<any>(this.dataExtractionQuestionsUrl, body);
  }

  generateIntroduction(data: {
    title: string;
    description: string;
    objective: string;
    area_conocimiento?: string;
    tipo_investigacion?: string;
  }) {
    return this.http.post<any>(this.introductionUrl, data);
  }
}