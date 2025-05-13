import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private introKeywordsUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-introduction-keywords';
  private trabaRelaKeywordsUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/trabaRelaKeywords';
  private qualityTrabajosUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-trabajos-relacionados';
  private metodologiaUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-metodologia';
  private resultadosUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-resultados';
  private discussionUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-discussion';
  private discussionKeywordsUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-discussion-keywords';
  private limitacionesUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-limitaciones';
  private conclusionUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-conclusion';
  private resumenUrl = 'https://backend-chatgpt-g3rn.onrender.com/api/generate-resumen';

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

  generatetrabaRelaKeywords(payload: { text: string; n?: number }): Observable<{ keywords: string }> {
    return this.http.post<{ keywords: string }>(this.trabaRelaKeywordsUrl, payload);
  }

  generateTrabajosRelated(payload: {
    title: string;
    description?: string;
    criterios_seleccion: string;
    keywords: string;
  }): Observable<{
    trabajos_relacionados: string;
    references: string[];
  }> {
    return this.http.post<{
      trabajos_relacionados: string;
      references: string[];
    }>(this.qualityTrabajosUrl, payload);
  }

  generateMetodologia(payload: any): Observable<any> {
    return this.http.post<any>(this.metodologiaUrl, payload);
  }

  generateResultados(payload: any): Observable<any> {
    // Ejemplo de URL
    return this.http.post<any>(this.resultadosUrl, payload);
  }

  generateDiscussion(payload: any): Observable<{ discusion: string; referencias: string[] }> {
    return this.http.post<{ discusion: string; referencias: string[] }>(this.discussionUrl, payload);
  }

  generatediscussionKeywords(payload: any): Observable<{ keywords: string }> {
    return this.http.post<{ keywords: string }>(this.discussionKeywordsUrl, payload);
  }

  generateLimitaciones(payload: any): Observable<any> {
    return this.http.post<any>(this.limitacionesUrl, payload);
  }

  generateConclusion(payload: any): Observable<any> {
    // Asegúrate de tener this.conclusionUrl definido en tu constructor
    return this.http.post<any>(this.conclusionUrl, payload);
  }

  generateIntroductionKeywords(payload: any): Observable<{ keywords: string }> {
    return this.http.post<{ keywords: string }>(this.introKeywordsUrl, payload);
  }

  generateIntroduction(payload: {
    title: string;
    description: string;
    objective: string;
    methodology: any;
    results_summary: any;
    discussion_summary: string[];
    conclusions: string;
    research_questions: string[];
    keywords: string;
  }): Observable<{
    introduction: string;
    references: string[];
  }> {
    return this.http.post<{
      introduction: string;
      references: string[];
    }>(this.introductionUrl, payload);
  }

  generateResumen(payload: any): Observable<any> {
    // Asegúrate de que this.referenciasUrl apunte al endpoint correcto, ej:
    return this.http.post<any>(this.resumenUrl, payload);
  }
}