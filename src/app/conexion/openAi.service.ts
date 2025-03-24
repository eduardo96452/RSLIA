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
  private qualityQuestionsUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-quality-questions';
  private dataExtractionQuestionsUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-data-extraction-questions';
  private extractionSuggestionsUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-extraction-suggestions';
  private introductionUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-introduction';
  private qualityTrabajosUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-trabajos-relacionados';
  private metodologiaUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-metodologia';
  private resultadosUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-resultados';
  private discussionUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-discusion';
  private limitacionesUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-limitaciones';
  private conclusionUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-conclusion';
  private referenciasUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-referencias';

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

  getSearchString(payload: { keywords: any[]; idioma: string }): Observable<any> {
    return this.http.post<any>(this.searchStringUrl, payload);
  }

  generateCriteria(title: string, objective: string): Observable<any> {
    return this.http.post<any>(this.criteriaUrl, { title, objective });
  }

  getQualityQuestions(title: string, objective: string): Observable<any> {
    return this.http.post<any>(this.qualityQuestionsUrl, { title, objective });
  }

  generateDataExtractionQuestions(
    title: string,
    objective: string,
    numberOfQuestions: number
  ): Observable<any> {
    const body = { title, objective, numberOfQuestions };
    return this.http.post<any>(this.dataExtractionQuestionsUrl, body);
  }

  generateExtractionSuggestions(payload: any): Observable<any> {
    return this.http.post<any>(this.extractionSuggestionsUrl, payload);
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

  generateTrabajosRelated(payload: any): Observable<any> {
    return this.http.post<any>(this.qualityTrabajosUrl, payload);
  }

  generateMetodologia(payload: any): Observable<any> {
    return this.http.post<any>(this.metodologiaUrl, payload);
  }
  
  generateResultados(payload: any): Observable<any> {
    // Ejemplo de URL
    return this.http.post<any>(this.resultadosUrl, payload);
  }

  generateDiscussion(payload: any): Observable<any> {
    return this.http.post<any>(this.discussionUrl, payload);
  }

  generateLimitaciones(payload: any): Observable<any> {
    return this.http.post<any>(this.limitacionesUrl, payload);
  }
  
  generateConclusion(payload: any): Observable<any> {
    // Asegúrate de tener this.conclusionUrl definido en tu constructor
    return this.http.post<any>(this.conclusionUrl, payload);
  }
  
  generateReferencias(payload: any): Observable<any> {
    // Asegúrate de que this.referenciasUrl apunte al endpoint correcto, ej:
    // this.referenciasUrl = 'https://mi-backend.com/api/generate-referencias';
    return this.http.post<any>(this.referenciasUrl, payload);
  }
  
  
}