import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../conexion/supabase.service';
import { createClient, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { BehaviorSubject, from, map, Observable } from 'rxjs';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

export interface DetallesRevision {
  id_detalles_revision: string;
  id_usuarios: string;
  titulo_revision: string;
  objetivo?: string;
  tipo_revision: string;
  descripcion: string;
  fecha_creacion: string;
  fecha_modificacion: string;
  alcance?: string | null;
  pais?: string | null;
  ciudad?: string | null;
  area_conocimiento?: string;
  tipo_investigacion?: string;
  institucion?: string | null;
}

export interface Metodologia {
  id_metodologia: number;
  nombre: string;
  descripcion: string;
}

interface Componente {
  id_componente: number;
  nombre: string;
  sigla: string;
  descripcion: string;
  id_metodologia: number;
}

interface ComponenteRevision {
  id_revision: number;
  id_componente: number;
  palabra_clave: string;
  // otros campos si tu tabla los tiene
}

interface ComponenteData {
  sigla: string;
  id_metodologia: number;
}

interface ComponenteRevisionData {
  id_revision: number;
  id_componente: number;
  palabra_clave: string;
  // componente es un array:
  componente: ComponenteData[];
}

export interface Question {
  id: number;
  id_detalles_revision?: string;
  value: string;
  isSaved?: boolean;
  isEditing?: boolean;
}

export interface KeywordRow {
  id_palabras_clave: number | null;
  keyword: string;
  synonyms: string[];
  id_sinonimos: number | null;
  related?: any;
  isEditing: boolean;
  // Otras propiedades...
}

export interface BaseBibliografica {
  id_base_bibliografica?: number; // PK en BD
  id_revision: string;            // FK a detalles_revision
  nombre: string;
  url: string;
  isEditing: boolean; // Para controlar el modo edición en el componente
}

export interface Criterio {
  id_criterios?: number; // ID del criterio (puede ser indefinido al agregar nuevos)
  descripcion: string;   // Descripción del criterio
  tipo: 'exclusion' | 'inclusion'; // Tipo del criterio
  isEditing?: boolean;   // Para controlar el modo de edición en la tabla

}

export interface Pregunta {
  id_pregunta: number;         // ID que viene de la BD
  descripcion: string;         // Texto de la pregunta
  id_detalles_revision?: number; // Si lo requieres para la relación
  // ... cualquier otro campo que retorne tu base de datos
}

export interface Respuesta {
  id_respuesta: number;
  descripcion: string;
  peso: number;
  id_detalles_revision?: number;
  isEditing?: boolean;    // true si la fila está en edición
}

export interface Study {
  database: string;
  author: string;
  booktitle: string;
  title: string;
  year: string;
  volume: string;
  number: string;
  pages: string;
  keywords: string;
  doi: string;
  status: string;
  isSelected?: boolean; // Para la acción: Sin clasificar, Aceptado, etc.
  id_estudios?: number;
  revista: string;
  author_keywords?: string;
  bibtex_key?: string;
  document_type?: string;
  url?: string;
  afiliacion?: string;
  publisher?: string;
  issn?: string;
  language?: string;
  comentario?: string;
  resumen: string;
  url_pdf_articulo?: string;
  id_criterio?: number;
}

export interface Estudio {
  id_estudios?: number;
  titulo: string;
  resumen: string;
  autores: string;
  anio: number;
  revista: string;
  doi: string;
  fecha_ingreso?: string;
  id_detalles_revision: string;
  estado: string;
  id_criterio?: number;
  keywords?: string;
  author_keywords?: string;
  bibtex_key?: string;
  document_type?: string;
  paginas?: string;
  volumen?: string;
  url?: string;
  afiliacion?: string;
  publisher?: string;
  issn?: string;
  language?: string;
  comentario?: string;
  fuente_bibliografica?: string;
  url_pdf_articulo?: string | null | undefined;
  selectedAnswers?: { [questionId: string]: number };
  savedEvaluation?: { [questionId: number]: any };
}

export interface Criterio1 {
  id_criterios: number;
  descripcion: string;
  tipo: string; // "inclusion" | "exclusion"
  fecha_ingreso?: string;
  id_detalles_revision: string;
}

export interface DataField {
  id_extraction_field?: number; // ID de la BD
  id_revision: string;          // ID de la revisión
  descripcion: string;
  tipo: string;
  orden: number;
  isEditing: boolean;
}



@Injectable({
  providedIn: 'root'
})
export class AuthService {

  _supabaseClient = inject(SupabaseService).supabaseClient;
  private authState = new BehaviorSubject<boolean>(false);
  private router = inject(Router);  // Inyección de Router
  private inactivityTimeoutId: any;  // ID del temporizador de inactividad
  private readonly inactivityLimit = 10 * 60 * 60 * 1000; // 15 horas en milisegundos

  constructor() {
    // Manejar cambios en el estado de autenticación de Supabase
    this._supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session) {
        this.authState.next(true);
        this.startInactivityTracking();

        // Almacenar solo el ID del usuario en localStorage
        if (session.user) {
          localStorage.setItem('user_id', session.user.id);
        }
      } else {
        this.authState.next(false);
        this.stopInactivityTracking();

        // Remover el ID del usuario del localStorage cuando no hay sesión
        localStorage.removeItem('user_id');
      }
    });

    // Inicia el seguimiento de inactividad desde el principio
    this.startInactivityTracking();
  }

  // Inicia el seguimiento de actividad del usuario
  private startInactivityTracking() {
    this.resetInactivityTimer();

    // Añadir detectores de eventos para actividad del usuario
    window.addEventListener('mousemove', this.resetInactivityTimerBound);
    window.addEventListener('keypress', this.resetInactivityTimerBound);
    window.addEventListener('scroll', this.resetInactivityTimerBound);
    window.addEventListener('touchstart', this.resetInactivityTimerBound);
  }

  // Detiene el seguimiento de inactividad y elimina detectores de eventos
  private stopInactivityTracking() {
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
    }
    window.removeEventListener('mousemove', this.resetInactivityTimerBound);
    window.removeEventListener('keypress', this.resetInactivityTimerBound);
    window.removeEventListener('scroll', this.resetInactivityTimerBound);
    window.removeEventListener('touchstart', this.resetInactivityTimerBound);
  }

  // Usamos una referencia vinculada para mantener el contexto de 'this'
  private resetInactivityTimerBound = this.resetInactivityTimer.bind(this);

  // Reinicia el temporizador de inactividad
  private resetInactivityTimer() {
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
    }
    this.inactivityTimeoutId = setTimeout(() => {
      this.handleInactivityTimeout();
    }, this.inactivityLimit);
  }

  // Maneja el cierre de sesión por inactividad
  private async handleInactivityTimeout() {
    // Cerrar sesión en Supabase
    await this._supabaseClient.auth.signOut();
    this.stopInactivityTracking();

    // Mostrar alerta con SweetAlert2
    Swal.fire({
      title: 'Sesión Cerrada',
      text: 'Su sesión ha sido cerrada por inactividad.',
      icon: 'warning',
      confirmButtonText: 'Aceptar'
    }).then(() => {
      // Redirigir a la ruta /inicio después de que el usuario cierre la alerta
      this.router.navigate(['/inicio']);
    });
  }

  async getSession() {
    const { data: { session } } = await this._supabaseClient.auth.getSession();
    return session;
  }

  isAuthenticated(): Observable<boolean> {
    return this.authState.asObservable();
  }


  signUp(credentials: SignUpWithPasswordCredentials) {
    return this._supabaseClient.auth.signUp(credentials);
  }


  logIn(credentials: { email: string; password: string }) {
    return this._supabaseClient.auth.signInWithPassword(credentials);
  }


  signOut() {
    return this._supabaseClient.auth.signOut();
  }

  async sendResetEmail(email: string): Promise<{ error: any }> {
    // Ajusta la URL a la cual Supabase redireccionará luego de hacer clic en el correo
    const redirectUrl = 'https://rslaia1.web.app/cambiarcontrasena'; // Por ejemplo

    const { data, error } = await this._supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    return { error };
  }

  async addUserToDatabase(id_usuario: string, nombre: string, correo_electronico: string, contrasena: string) {
    const { data, error } = await this._supabaseClient
      .from('usuarios') // Nombre de la tabla en Supabase
      .insert([
        {
          id_usuarios: id_usuario, // Asegúrate de que coincide con la columna
          nombre_usuario: nombre,
          correo_electronico,
          contrasena
        }
      ]);
    return { data, error };
  }

  async getUserDataByUID(uid: string) {
    const { data, error } = await this._supabaseClient
      .from('usuarios')
      .select('id_usuarios, nombre_usuario, correo_electronico, nombre, apellido, institucion, ruta_imagen, orcid, profesion, pais') // Selecciona las columnas que necesitas
      .eq('id_usuarios', uid)
      .single();

    if (error) {
      console.error('Error al obtener los datos del usuario:', error);
      return null;
    }
    return data;
  }

  async getCurrentUserData() {
    const session = await this.getSession();
    if (session?.user) {
      return this.getUserDataByUID(session.user.id); // UID del usuario
    }
    return null;
  }

  async updateUser(uid: string, userData: {
    nombre: string;
    apellido: string;
    correo_electronico: string;
    institucion: string;
    nombre_usuario: string;
    ruta_imagen: string;
    orcid: string;
    profesion: string;
    pais: string
  }) {
    const { data, error } = await this._supabaseClient
      .from('usuarios')
      .update({
        nombre: userData.nombre,
        apellido: userData.apellido,
        correo_electronico: userData.correo_electronico,
        institucion: userData.institucion,
        nombre_usuario: userData.nombre_usuario,
        ruta_imagen: userData.ruta_imagen,
        orcid: userData.orcid,
        profesion: userData.profesion,
        pais: userData.pais
      })
      .eq('id_usuarios', uid)
      // Con este método, Supabase retorna los registros actualizados.
      .select();

    if (error) {
      console.error('Error al actualizar los datos del usuario:', error);
    }

    return { data, error };
  }

  async uploadFile(filePath: string, file: File) {
    const { data, error } = await this._supabaseClient
      .storage
      .from('avatars')  // El bucket de almacenamiento (asegúrate de crear un bucket llamado 'avatars')
      .upload(filePath, file);

    if (error) {
      console.error('Error al subir el archivo:', error);
      return { error };
    }
    return { data };
  }

  // Función para crear una nueva reseña (detalles_revision)
  async createReview(data: {
    id_usuarios: string;
    titulo_revision: string;
    objetivo?: string;
    tipo_revision: string;
    descripcion: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    alcance?: string | null;
    pais?: string | null;
    ciudad?: string | null;
    area_conocimiento?: string | null;
    tipo_investigacion?: string | null;
    institucion?: string | null;
  }): Promise<{ insertData: DetallesRevision[] | null; error: any }> {
    const { data: insertData, error } = await this._supabaseClient
      .from('detalles_revision')
      .insert([data])
      .select(); // Retorna los datos insertados
    if (error) {
      console.error('Error al crear la reseña:', error);
      return { insertData: null, error };
    }
    return { insertData, error };
  }

  async eliminarRevision(idRevision: number): Promise<{ error: any }> {
    const { error } = await this._supabaseClient
      .from('detalles_revision')
      .delete()
      .eq('id_detalles_revision', idRevision);
    return { error };
  }


  async countUserReviews(userId: string) {
    const { count, error } = await this._supabaseClient
      .from('detalles_revision') // Nombre de la tabla
      .select('*', { count: 'exact', head: true })
      .eq('id_usuarios', userId); // Filtra por el usuario autenticado

    if (error) {
      console.error('Error al contar las revisiones del usuario:', error);
      return 0; // Retorna 0 en caso de error
    }

    return count || 0; // Retorna el conteo obtenido
  }

  async countUserDocuments(userId: string): Promise<number> {
    try {
      // Primero obtén todos los id_detalles_revision asociados al usuario
      const { data: revisions, error: revisionError } = await this._supabaseClient
        .from('detalles_revision')
        .select('id_detalles_revision')
        .eq('id_usuarios', userId);

      if (revisionError) {
        console.error('Error al obtener id_detalles_revision:', revisionError);
        return 0;
      }

      if (!revisions || revisions.length === 0) {
        console.warn('No se encontraron revisiones para este usuario.');
        return 0;
      }

      // Extrae los id_detalles_revision en un array
      const revisionIds = revisions.map((revision) => revision.id_detalles_revision);

      // Ahora cuenta los documentos en la tabla "estudios" que correspondan a estos id_detalles_revision
      const { count, error: countError } = await this._supabaseClient
        .from('estudios')
        .select('*', { count: 'exact', head: true })
        .in('id_detalles_revision', revisionIds); // Filtra por id_detalles_revision

      if (countError) {
        console.error('Error al contar los documentos procesados:', countError);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Error inesperado:', err);
      return 0;
    }
  }

  async countUserDocumentsByRevision(userId: string, revisionId: string): Promise<number> {
    try {
      // 1) Verificar que la revisión pertenezca al usuario
      const { data: revision, error: revisionError } = await this._supabaseClient
        .from('detalles_revision')
        .select('id_detalles_revision')
        .eq('id_usuarios', userId)
        .eq('id_detalles_revision', revisionId)
        .single();

      if (revisionError) {
        console.error('Error al obtener la revisión:', revisionError);
        return 0;
      }

      if (!revision) {
        console.warn('No se encontró esa revisión para este usuario.');
        return 0;
      }

      // 2) Contar documentos en "estudios" para ese id_detalles_revision
      const { count, error: countError } = await this._supabaseClient
        .from('estudios')
        .select('*', { count: 'exact', head: true })
        .eq('id_detalles_revision', revisionId);

      if (countError) {
        console.error('Error al contar documentos:', countError);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Error inesperado:', err);
      return 0;
    }
  }

  async getEstudiosDistributionByDatabase(): Promise<{ [key: string]: number }> {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      throw new Error('User ID not found in localStorage');
    }

    // Obtener todos los id_detalles_revision asociados al usuario
    const { data: detallesRevision, error: detallesError } = await this._supabaseClient
      .from('detalles_revision')
      .select('id_detalles_revision')
      .eq('id_usuarios', userId);

    if (detallesError) {
      throw new Error('Error fetching detalles_revision: ' + detallesError.message);
    }

    const idsDetallesRevision = detallesRevision.map(d => d.id_detalles_revision);

    // Obtener todos los estudios asociados a esos id_detalles_revision
    const { data: estudios, error: estudiosError } = await this._supabaseClient
      .from('estudios')
      .select('fuente_bibliografica')
      .in('id_detalles_revision', idsDetallesRevision);

    if (estudiosError) {
      throw new Error('Error fetching estudios: ' + estudiosError.message);
    }

    // Contar la cantidad de estudios por base de datos
    const distribution: { [key: string]: number } = {};
    estudios.forEach(estudio => {
      const fuente = estudio.fuente_bibliografica;
      if (fuente) {
        if (distribution[fuente]) {
          distribution[fuente]++;
        } else {
          distribution[fuente] = 1;
        }
      }
    });

    return distribution;
  }

  async getUserReviews(userId: string) {
    console.log('Fetching reviews for user:', userId);

    const { data, error } = await this._supabaseClient
      .from('detalles_revision')
      .select('id_detalles_revision, titulo_revision, fecha_modificacion')
      .eq('id_usuarios', userId);

    if (error) {
      console.error('Error en la consulta:', error);
      return [];
    }

    console.log('Data received:', data);
    return data || [];
  }

  async getReviewById(reviewId: string) {
    const { data, error } = await this._supabaseClient
      .from('detalles_revision')
      .select(`
        id_detalles_revision,
        id_usuarios,
        titulo_revision,
        objetivo,
        tipo_revision,
        descripcion,
        fecha_creacion,
        fecha_modificacion,
        alcance,
        pais,
        ciudad,
        area_conocimiento,
        tipo_investigacion,
        institucion
      `)
      .eq('id_detalles_revision', reviewId)
      .single(); // Se espera un único registro

    if (error) {
      console.error('Error al obtener la reseña por ID:', error);
      return null;
    }
    return data;
  }


  async updateReview(reviewId: string, updatedData: {
    titulo_revision: string;
    objetivo?: string;
    tipo_revision: string;
    descripcion: string;
    fecha_modificacion?: string;
    alcance?: string | null;
    pais?: string | null;
    ciudad?: string | null;
    area_conocimiento?: string | null;
    tipo_investigacion?: string | null;
    institucion?: string | null;
  }): Promise<{ data: any; error: any }> {
    // Actualizamos la fecha de modificación automáticamente
    updatedData.fecha_modificacion = new Date().toISOString();

    const { data, error } = await this._supabaseClient
      .from('detalles_revision')
      .update(updatedData)
      .eq('id_detalles_revision', reviewId);

    if (error) {
      console.error('Error al actualizar la reseña:', error);
    }
    return { data, error };
  }


  async updateReviewObjective(reviewId: string, newObjective: string) {
    const { data, error } = await this._supabaseClient
      .from('detalles_revision')
      .update({ objetivo: newObjective })
      .eq('id_detalles_revision', reviewId);

    if (error) {
      console.error('Error al actualizar el objetivo:', error);
      return { error };
    }

    // Si la actualización fue exitosa, data contendrá la nueva información
    return { data };
  }

  async getMetodologias(): Promise<Metodologia[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('metodologias')
        .select('*'); // Ajusta si solo quieres columnas específicas

      if (error) {
        console.error('Error al obtener metodologías:', error);
        return [];
      }

      return data as Metodologia[];
    } catch (err) {
      console.error('Error inesperado al obtener metodologías:', err);
      return [];
    }
  }

  async getMetodologiaByName(nombre: string): Promise<Metodologia | null> {
    try {
      const { data, error } = await this._supabaseClient
        .from('metodologias')
        .select('*')
        .eq('nombre', nombre)
        .single(); // .single() asumes que solo habrá un registro único

      if (error) {
        console.error('Error al obtener metodología por nombre:', error);
        return null;
      }

      return data ? (data as Metodologia) : null;
    } catch (err) {
      console.error('Error inesperado al obtener la metodología:', err);
      return null;
    }
  }

  async getComponentesByMetodologiaId(idMetodologia: number): Promise<Componente[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('componente')
        .select('*')
        .eq('id_metodologia', idMetodologia);

      if (error) {
        console.error('Error al obtener componentes:', error);
        return [];
      }

      return data as Componente[];
    } catch (err) {
      console.error('Error inesperado al obtener componentes:', err);
      return [];
    }
  }

  async getMetodologiaByRevisionId(reviewId: string): Promise<Metodologia | null> {
    try {
      // 1. Buscar si la revisión tiene componentes asociados
      const { data: compRevData, error: compRevError } = await this._supabaseClient
        .from('componente_revision')
        .select('id_componente')
        .eq('id_revision', reviewId);

      if (compRevError) {
        console.error('Error al obtener componente_revision:', compRevError);
        return null;
      }

      // Si no hay registros, asumimos que no hay metodología asociada
      if (!compRevData || compRevData.length === 0) {
        return null;
      }

      // Tomamos el primer componente (asumiendo que todos pertenecen a la misma metodología)
      const idComponente = compRevData[0].id_componente;

      // 2. Obtenemos el componente para saber su id_metodologia
      const { data: compData, error: compError } = await this._supabaseClient
        .from('componente')
        .select('id_metodologia')
        .eq('id_componente', idComponente)
        .single();

      if (compError) {
        console.error('Error al obtener componente:', compError);
        return null;
      }
      if (!compData) {
        return null;
      }

      // 3. Ahora con el id_metodologia, vamos a la tabla metodologias
      const idMetodologia = compData.id_metodologia;

      const { data: metodologiaData, error: metodologiaError } = await this._supabaseClient
        .from('metodologias')
        .select('*')
        .eq('id_metodologia', idMetodologia)
        .single();

      if (metodologiaError) {
        console.error('Error al obtener la metodología:', metodologiaError);
        return null;
      }

      if (!metodologiaData) {
        return null;
      }

      // Retornamos la metodología
      return metodologiaData as Metodologia;
    } catch (err) {
      console.error('Error inesperado al obtener metodología por revisión:', err);
      return null;
    }
  }

  async deleteMethodologiaByRevisionId(reviewId: string): Promise<boolean> {
    try {
      // 1) Eliminar registros de la tabla "componente_revision"
      const { data: compData, error: compError } = await this._supabaseClient
        .from('componente_revision')
        .delete()
        .eq('id_revision', reviewId);

      if (compError) {
        console.error('Error al borrar metodología (componente_revision):', compError);
        return false;
      }

      // 2) Eliminar registros de la tabla "cadenas_busqueda"
      const { data: cadsData, error: cadsError } = await this._supabaseClient
        .from('cadenas_busqueda')
        .delete()
        .eq('id_detalles_revision', reviewId);

      if (cadsError) {
        console.error('Error al borrar cadenas de búsqueda (cadenas_busqueda):', cadsError);
        return false;
      }

      // Si ambas eliminaciones se realizaron sin error, retornamos true
      return true;
    } catch (err) {
      console.error('Error inesperado al borrar registros:', err);
      return false;
    }
  }


  async insertComponenteRevision(
    idRevision: string,
    idComponente: number,
    palabraClave: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this._supabaseClient
        .from('componente_revision')
        .insert([{
          id_revision: idRevision,
          id_componente: idComponente,
          palabra_clave: palabraClave
        }]);

      if (error) {
        console.error('Error al insertar componente_revision:', error);
        return false;
      }

      // data retornará el nuevo registro insertado si lo deseas manipular
      return true;
    } catch (err) {
      console.error('Error inesperado al insertar componente_revision:', err);
      return false;
    }
  }

  async getComponentesRevisionByReviewId(reviewId: string): Promise<ComponenteRevisionData[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('componente_revision')
        // Ojo a la sintaxis: 
        // Seleccionas la subcolumna "componente" como un array de { sigla, id_metodologia }
        .select(`
          id_revision,
          id_componente,
          palabra_clave,
          componente:componente (
            sigla,
            id_metodologia
          )
        `)
        .eq('id_revision', reviewId);

      if (error) {
        console.error('Error al obtener componente_revision:', error);
        return [];
      }

      // Aquí verás la forma exacta en que Supabase te devuelve el resultado

      // Retornamos el array tipado
      return data as ComponenteRevisionData[];
    } catch (err) {
      console.error('Error inesperado al obtener componente_revision:', err);
      return [];
    }
  }

  async saveResearchQuestion(question: Question): Promise<any> {
    const { data, error } = await this._supabaseClient
      .from('preguntas_investigacion') // Nombre de la tabla
      .insert([
        {
          pregunta: question.value,
          id_detalles_revision: question.id_detalles_revision || null, // Asociado a una revisión
        }
      ]);

    if (error) {
      console.error('Error al guardar la pregunta:', error.message);
    }
    return { data, error };
  }

  async deleteResearchQuestion(id_preguntas_investigacion: number): Promise<any> {
    const { data, error } = await this._supabaseClient
      .from('preguntas_investigacion') // Nombre de la tabla
      .delete()
      .eq('id_preguntas_investigacion', id_preguntas_investigacion); // Filtra por el ID de la pregunta

    if (error) {
      console.error('Error al eliminar la pregunta:', error.message);
    }
    return { data, error };
  }

  async getResearchQuestionsByRevision(id_detalles_revision: string): Promise<any> {
    const { data, error } = await this._supabaseClient
      .from('preguntas_investigacion') // Nombre de la tabla
      .select('*') // Selecciona todas las columnas
      .eq('id_detalles_revision', id_detalles_revision); // Filtra por el ID de la revisión

    if (error) {
      console.error('Error al obtener preguntas:', error.message);
    }
    return { data, error };
  }

  async updateQuestion(question: Question): Promise<{ error?: any }> {
    try {
      const { data, error } = await this._supabaseClient
        .from('preguntas_investigacion')
        .update({ pregunta: question.value })
        .eq('id_preguntas_investigacion', question.id);

      if (error) {
        console.error('Error al actualizar la pregunta en la BD:', error.message || error);
        return { error };
      }

      return {};
    } catch (err) {
      console.error('Error inesperado al actualizar la pregunta:', err);
      return { error: err };
    }
  }

  async getComponentsByMethodologyName(metodologiaNombre: string): Promise<{ id: number; nombre: string }[]> {
    try {
      // 1. Obtener id_metodologia según el nombre
      const { data: metodologiaData, error: metodologiaError } = await this._supabaseClient
        .from('metodologias')
        .select('id_metodologia')
        .eq('nombre', metodologiaNombre)
        .single();

      if (metodologiaError) {
        console.error('Error al obtener la metodología:', metodologiaError);
        return [];
      }
      if (!metodologiaData) {
        console.warn('No se encontró metodología con el nombre:', metodologiaNombre);
        return [];
      }

      const idMetodologia = metodologiaData.id_metodologia;

      // 2. Con el id_metodologia, consultar la tabla "componente"
      const { data: componentesData, error: componentesError } = await this._supabaseClient
        .from('componente')
        .select('id_componente, nombre')
        .eq('id_metodologia', idMetodologia);

      if (componentesError) {
        console.error('Error al obtener los componentes:', componentesError);
        return [];
      }

      // Retornamos un array de objetos { id, nombre }
      return (componentesData || []).map((comp: any) => ({
        id: comp.id_componente,
        nombre: comp.nombre
      }));
    } catch (err) {
      console.error('Error inesperado en getComponentsByMethodologyName:', err);
      return [];
    }
  }

  async registerSynonymThenKeyword(
    sinonimo: string,
    palabraClave: string,
    idDetallesRevision: string,
    idseccioncomponente: string, // ID que usarás para buscar en componente_revision
    seccionMetodologia: string,
    fechaIngreso?: string
  ): Promise<{ data?: any; error?: any }> {
    try {
      // ===========================
      // 0) Buscar el id_componente_revision 
      //    usando el idseccionMetodologia que recibes
      // ===========================
      const { data: compRevData, error: compRevError } = await this._supabaseClient
        .from('componente_revision')
        .select('id_componente_revision') // Ajusta si necesitas más columnas
        .eq('id_componente', idseccioncomponente)
        .single();

      if (compRevError) {
        console.error('Error al buscar componente_revision:', compRevError);
        return { error: compRevError };
      }

      if (!compRevData) {
        return {
          error: new Error(`No se encontró un componente_revision con el ID`)
        };
      }

      const foundCompRevId = compRevData.id_componente_revision;

      console.log(foundCompRevId);

      // ===========================
      // 1) Insertar primero el sinónimo en la tabla "sinonimos",
      //    usando el foundCompRevId como id_componente_revision
      // ===========================
      const { data: synData, error: synError } = await this._supabaseClient
        .from('sinonimos')
        .insert([
          {
            id_componente_revision: foundCompRevId,
            sinonimo: sinonimo
          }
        ])
        .select(); // Para retornar el registro insertado (Supabase >= 2.0)

      if (synError) {
        console.error('Error al insertar sinónimo:', synError);
        return { error: synError };
      }

      if (!synData || synData.length === 0) {
        // No se devolvió nada, algo falló
        return { error: new Error('No se pudo insertar el sinónimo.') };
      }

      // Se toma el primer sinónimo insertado
      const newSynonym = synData[0];
      const newSynonymId = newSynonym.id_sinonimos;

      // ===========================
      // 2) Insertar ahora la palabra clave en la tabla "palabras_clave"
      //    Usando el id_sinonimos recién obtenido
      // ===========================
      const { data: kwData, error: kwError } = await this._supabaseClient
        .from('palabras_clave')
        .insert([
          {
            palabra_clave: palabraClave,
            fecha_ingreso: fechaIngreso || new Date().toISOString(),
            id_detalles_revision: idDetallesRevision,
            seccion_metodologia: seccionMetodologia,
            id_sinonimos: newSynonymId // Vincula este sinónimo en la palabra clave
          }
        ])
        .select(); // Para obtener el registro creado

      if (kwError) {
        console.error('Error al insertar en palabras_clave:', kwError);
        return { error: kwError };
      }

      if (!kwData || kwData.length === 0) {
        return { error: new Error('No se pudo insertar la palabra clave.') };
      }

      // Retorna ambos registros (sinónimo y palabra clave) si lo deseas
      return {
        data: {
          synonym: newSynonym,
          keyword: kwData[0]
        }
      };
    } catch (err) {
      console.error('Error inesperado al registrar sinónimo y palabra clave:', err);
      return { error: err };
    }
  }

  async getKeywordsAndSynonyms(reviewId: string): Promise<any[]> {
    try {
      // Ejemplo usando un JOIN (ajusta según tu estructura y relaciones en Supabase):
      const { data, error } = await this._supabaseClient
        .from('palabras_clave')
        .select(`
          *,
          sinonimos:sinonimos!inner(*)
        `)
        .eq('id_detalles_revision', reviewId);

      if (error) {
        console.error('Error al cargar palabras clave y sinónimos:', error);
        return [];
      }

      // data es un array donde, para cada palabra clave, el campo "sinonimos" es un array de registros
      return data;
    } catch (err) {
      console.error('Error inesperado al cargar palabras clave y sinónimos:', err);
      return [];
    }
  }

  async getIdComponenteFromSinonimos(id_sinonimos: string): Promise<number | null> {
    try {
      // Primera consulta: obtener el id_componente_revision desde la tabla "sinonimos"
      const { data: sinonimosData, error: sinonimosError } = await this._supabaseClient
        .from('sinonimos')
        .select('id_componente_revision')
        .eq('id_sinonimos', id_sinonimos)
        .single();

      if (sinonimosError || !sinonimosData) {
        console.error('Error al obtener id_componente_revision desde sinonimos:', sinonimosError);
        return null;
      }

      const id_componente_revision = sinonimosData.id_componente_revision;

      // Segunda consulta: con el id_componente_revision, obtener el id_componente desde "componente_revision"
      const { data: compRevData, error: compRevError } = await this._supabaseClient
        .from('componente_revision')
        .select('id_componente')
        .eq('id_componente_revision', id_componente_revision)
        .single();

      if (compRevError || !compRevData) {
        console.error('Error al obtener id_componente desde componente_revision:', compRevError);
        return null;
      }

      return compRevData.id_componente;
    } catch (err) {
      console.error('Error inesperado en getIdComponenteFromSinonimos:', err);
      return null;
    }
  }

  async updateSynonymThenKeyword(
    idSinonimos: string,
    idPalabrasClave: string,
    sinonimo: string,
    palabraClave: string,
    idDetallesRevision: string,
    idseccioncomponente: string,
    seccionMetodologia: string,
    fechaIngreso?: string
  ): Promise<{ data?: any; error?: any }> {
    try {
      // ===========================
      // 0) Buscar el id_componente_revision 
      //    usando el idseccionMetodologia que recibes
      // ===========================
      const { data: compRevData, error: compRevError } = await this._supabaseClient
        .from('componente_revision')
        .select('id_componente_revision') // Ajusta si necesitas más columnas
        .eq('id_componente', idseccioncomponente)
        .single();

      if (compRevError) {
        console.error('Error al buscar componente_revision:', compRevError);
        return { error: compRevError };
      }

      if (!compRevData) {
        return {
          error: new Error(`No se encontró un componente_revision con el ID`)
        };
      }

      const foundCompRevId = compRevData.id_componente_revision;

      console.log("Este es el id de contexto en la base de datos", foundCompRevId);

      // ===========================
      // 1) Actualizar el registro en la tabla "sinonimos"
      // ===========================
      const { data: synData, error: synError } = await this._supabaseClient
        .from('sinonimos')
        .update({
          sinonimo: sinonimo,
          // Actualiza también el id_componente_revision si lo requieres:
          id_componente_revision: foundCompRevId
        })
        .eq('id_sinonimos', idSinonimos)
        .select();

      if (synError) {
        console.error('Error al actualizar sinónimo:', synError);
        return { error: synError };
      }

      // ===========================
      // 2) Actualizar el registro en la tabla "palabras_clave"
      // ===========================
      const { data: kwData, error: kwError } = await this._supabaseClient
        .from('palabras_clave')
        .update({
          palabra_clave: palabraClave,
          fecha_ingreso: fechaIngreso || new Date().toISOString(),
          id_detalles_revision: idDetallesRevision,
          seccion_metodologia: seccionMetodologia
          // No es necesario actualizar id_sinonimos si ya está vinculado
        })
        .eq('id_palabras_clave', idPalabrasClave)
        .select();

      if (kwError) {
        console.error('Error al actualizar palabra clave:', kwError);
        return { error: kwError };
      }

      return {
        data: {
          synonym: synData,
          keyword: kwData
        }
      };

    } catch (err) {
      console.error('Error inesperado al actualizar sinónimo y palabra clave:', err);
      return { error: err };
    }
  }

  async deleteSynonym(idSinonimos: string): Promise<{ error?: any }> {
    try {
      const { error } = await this._supabaseClient
        .from('sinonimos')
        .delete()
        .eq('id_sinonimos', idSinonimos);
      return { error };
    } catch (err) {
      console.error('Error inesperado al eliminar el sinónimo:', err);
      return { error: err };
    }
  }

  async deleteKeyword(idPalabrasClave: number): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('palabras_clave')
      .delete()
      .eq('id_palabras_clave', idPalabrasClave);

    if (error) {
      console.error('Error al eliminar la palabra clave:', error.message);
    }
    return { data, error };
  }

  async insertarCadenaBusqueda(cadenaBusqueda: string, idDetallesRevision: string) {
    // La columna "fecha_creacion" puede ser un default en la BD
    const { data, error } = await this._supabaseClient
      .from('cadenas_busqueda')
      .insert([
        {
          cadena_busqueda: cadenaBusqueda,
          id_detalles_revision: idDetallesRevision
          // fecha_creacion: se asigna automáticamente si la BD tiene DEFAULT CURRENT_TIMESTAMP
        }
      ]);

    if (error) {
      console.error('Error al insertar cadena de búsqueda:', error.message);
    }
    return { data, error };
  }

  async getCadenaBusqueda(idDetallesRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('cadenas_busqueda')
      .select('id_cadenas_busqueda, cadena_busqueda')
      .eq('id_detalles_revision', idDetallesRevision)
    // .maybeSingle() // si sabes que sólo hay una cadena por revisión, puedes usar .single() o .maybeSingle()

    if (error) {
      console.error('Error al obtener cadena de búsqueda:', error.message);
    }
    return { data, error };
  }

  async getCriterios(idDetallesRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('criterios')
      .select('*')
      .eq('id_detalles_revision', idDetallesRevision);

    if (error) {
      console.error('Error al obtener criterios:', error.message);
    }
    return { data, error };
  }

  async insertCriterio(
    descripcion: string,
    tipo: string,
    idDetallesRevision: string
  ): Promise<{ data: { id_criterios: number; descripcion: string; tipo: string }[] | null; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('criterios')
      .insert([
        {
          descripcion,
          tipo,
          id_detalles_revision: idDetallesRevision
        }
      ])
      .select(); // Asegúrate de incluir .select() para devolver los datos insertados

    if (error) {
      console.error('Error al insertar criterio:', error.message);
    }
    return { data, error };
  }

  async deleteCriterio(idCriterios: number) {
    const { data, error } = await this._supabaseClient
      .from('criterios')
      .delete()
      .eq('id_criterios', idCriterios);

    if (error) {
      console.error('Error al eliminar criterio:', error.message);
    }
    return { data, error };
  }

  async updateCriterio(
    idCriterios: number,
    descripcion: string
  ) {
    const { data, error } = await this._supabaseClient
      .from('criterios')
      .update({ descripcion })
      .eq('id_criterios', idCriterios);

    if (error) {
      console.error('Error al actualizar criterio:', error.message);
    }
    return { data, error };
  }

  //pagina 2 de planeacion

  async getPreguntasByRevision(idRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_preguntas')
      .select('*')
      .eq('id_detalles_revision', idRevision);

    return { data, error };
  }

  async insertPregunta(descripcion: string, idRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_preguntas')
      .insert([
        {
          descripcion,
          id_detalles_revision: idRevision
        }
      ])
      .select();

    return { data, error };
  }

  async updatePregunta(idPregunta: number, nuevaDescripcion: string) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_preguntas')
      .update({ descripcion: nuevaDescripcion })
      .eq('id_pregunta', idPregunta)
      .select();

    return { data, error };
  }

  async deletePregunta(idPregunta: number) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_preguntas')
      .delete()
      .eq('id_pregunta', idPregunta)
      .select();

    return { data, error };
  }

  async getRespuestasByRevision(idRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_respuestas')
      .select('*')
      .eq('id_detalles_revision', idRevision);

    return { data, error };
  }

  async insertRespuesta(descripcion: string, peso: number, idRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_respuestas')
      .insert([
        {
          descripcion,
          peso,
          id_detalles_revision: idRevision
        }
      ])
      .select();

    return { data, error };
  }

  async updateRespuesta(idRespuesta: number, nuevaDescripcion: string, nuevoPeso: number) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_respuestas')
      .update({
        descripcion: nuevaDescripcion,
        peso: nuevoPeso
      })
      .eq('id_respuesta', idRespuesta)
      .select();

    return { data, error };
  }

  async deleteRespuesta(idRespuesta: number) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_respuestas')
      .delete()
      .eq('id_respuesta', idRespuesta)
      .select();

    return { data, error };
  }

  async getScoreByRevision(idRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('puntuaciones_evaluacion')
      .select('*')
      .eq('id_detalles_revision', idRevision)
      .select();

    if (error && error.details !== 'Results contain 0 rows') {
      // Manejo de error si no es el caso de "no hay filas"
      console.error('Error al obtener la puntuación:', error.message);
      throw error;
    }

    return data; // Retorna la fila o null si no hay
  }

  async saveLimitScore(
    idRevision: string,
    newLimit: number,
    newMax: number
  ): Promise<{ data: any; error: any }> {
    // 1) Verificar si ya existe un registro para esta revisión
    const { data: existingData, error: existingError } = await this._supabaseClient
      .from('puntuaciones_evaluacion')
      .select('*')
      .eq('id_detalles_revision', idRevision);

    if (existingError) {
      console.error('Error al consultar puntuaciones_evaluacion:', existingError);
      return { data: null, error: existingError };
    }

    // 2) Si existe, actualizamos
    if (existingData && existingData.length > 0) {
      const row = existingData[0]; // Tomamos la primera fila para actualizar
      const { data, error } = await this._supabaseClient
        .from('puntuaciones_evaluacion')
        .update({
          puntuacion_limite: newLimit,
          puntuacion_maxima: newMax,
          fecha_creacion: new Date().toISOString() // si quieres controlar la fecha
        })
        .eq('id_puntuacion', row.id_puntuacion)
        .select();

      return { data, error };

    } else {
      // 3) Si no existe, creamos un nuevo registro
      const { data, error } = await this._supabaseClient
        .from('puntuaciones_evaluacion')
        .insert([{
          id_detalles_revision: idRevision,
          puntuacion_limite: newLimit,
          puntuacion_maxima: newMax,
          fecha_creacion: new Date().toISOString()
        }])
        .select();

      return { data, error };
    }
  }

  async updateFieldOrder(id_extraction_field: string, newOrder: number): Promise<void> {
    const { error } = await this._supabaseClient
      .from('campos_extraccion') // Asegúrate de que este es el nombre correcto de la tabla
      .update({ orden: newOrder })
      .eq('id_campo_extraccion', id_extraction_field);

    if (error) {
      console.error('Error al actualizar el orden del campo:', error);
      throw error;
    }
  }

  async createEstudio(estudio: Estudio): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('estudios')
      .insert([estudio])
      .select();
    return { data, error };
  }

  async getEstudiosByRevision(
    idDetallesRevision: number
  ): Promise<{ data: Estudio[] | null; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('estudios')
      .select('*')
      .eq('id_detalles_revision', idDetallesRevision);

    return { data, error };
  }

  async getEstudioById(id: number): Promise<{ data: Estudio | null; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('estudios')
      .select('*')
      .eq('id_estudios', id)
      .single(); // Solo uno

    return { data, error };
  }

  async updateEstudio(
    idEstudios: number,
    changes: Partial<Estudio>
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('estudios')
      .update(changes)
      .eq('id_estudios', idEstudios)
      .select();

    return { data, error };
  }

  async deleteEstudio(id: number): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('estudios')
      .delete()
      .eq('id_estudios', id)
      .select();

    return { data, error };
  }

  async findStudyByTitleInRevision(
    titulo: string,
    idDetallesRevision: string
  ): Promise<{ data: Estudio[] | null; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('estudios')
      .select('*')
      .eq('titulo', titulo)
      .eq('id_detalles_revision', idDetallesRevision);

    return { data, error };
  }


  async uploadPDF(file: File, estudioId: number): Promise<string> {
    try {
      // Construye una ruta (path) única para el archivo en el bucket
      const filePath = `estudios/${estudioId}/${file.name}`;

      // Subir al bucket "documentos"
      const { data, error } = await this._supabaseClient.storage
        .from('documentos')
        .upload(filePath, file, {
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Obtener URL pública (asegúrate de que el bucket tenga política pública o uses signedUrl)
      const { data: publicData } = this._supabaseClient.storage
        .from('documentos')
        .getPublicUrl(filePath);

      // publicData.publicUrl contiene la URL pública
      const publicUrl = publicData.publicUrl;
      return publicUrl;
    } catch (error: any) {
      console.error('Error subiendo PDF:', error.message);
      throw error;
    }
  }


  async updateStudy(estudioData: Partial<Estudio>): Promise<any> {
    try {
      if (!estudioData.id_estudios) {
        throw new Error('No se proporcionó id_estudios para la actualización.');
      }

      // Realiza la actualización según tu modelo. Ajusta si necesitas mapear campos.
      const { data, error } = await this._supabaseClient
        .from('estudios')
        .update({
          // Asegúrate de mapear correctamente los campos que deseas actualizar
          titulo: estudioData.titulo,
          resumen: estudioData.resumen,
          autores: estudioData.autores,
          anio: estudioData.anio,
          revista: estudioData.revista,
          doi: estudioData.doi,
          estado: estudioData.estado,
          keywords: estudioData.keywords,
          author_keywords: estudioData.author_keywords,
          bibtex_key: estudioData.bibtex_key,
          document_type: estudioData.document_type,
          paginas: estudioData.paginas,
          volumen: estudioData.volumen,
          url: estudioData.url,
          afiliacion: estudioData.afiliacion,
          publisher: estudioData.publisher,
          issn: estudioData.issn,
          language: estudioData.language,
          comentario: estudioData.comentario,
          fuente_bibliografica: estudioData.fuente_bibliografica,
          url_pdf_articulo: estudioData.url_pdf_articulo
        })
        .eq('id_estudios', estudioData.id_estudios);

      if (error) {
        throw error;
      }
      return data;
    } catch (error: any) {
      console.error('Error actualizando estudio:', error.message);
      throw error;
    }
  }

  async removePDF(filePath: string): Promise<void> {
    // filePath sería algo como "estudios/10/mi_archivo.pdf"
    const { data, error } = await this._supabaseClient.storage
      .from('documentos')
      .remove([filePath]);

    if (error) {
      throw error;
    }
  }

  async removeFolder(folderPath: string): Promise<void> {
    // Listar los archivos dentro de la carpeta
    const { data: files, error: listError } = await this._supabaseClient.storage
      .from('documentos')
      .list(folderPath, { limit: 100, offset: 0 });
    if (listError) {
      throw listError;
    }

    // Si hay archivos, construir los paths completos y eliminarlos
    if (files && files.length > 0) {
      const filePaths = files.map(file => `${folderPath}/${file.name}`);
      const { error } = await this._supabaseClient.storage
        .from('documentos')
        .remove(filePaths);
      if (error) {
        throw error;
      }
    }
  }





  /**
 * Extrae el path usado en el bucket a partir de la URL pública devuelta por Supabase.
 * @example
 *  "https://xxxx.supabase.co/storage/v1/object/public/documentos/estudios/10/archivo.pdf"
 *  =>  "estudios/10/archivo.pdf"
 */
  getFilePathFromPublicURL(publicUrl: string): string {
    // Dividimos en la primera ocurrencia de 'documentos/'
    const parts = publicUrl.split('documentos/');
    return parts[1] ?? '';
  }

  /**
 * Inserta un nuevo estudio en la tabla "estudios".
 * @param estudioData Datos del estudio que se desean insertar.
 * @returns Promesa con el resultado de la inserción.
 */
  async insertStudy(estudioData: Partial<Estudio>): Promise<any> {
    try {
      // Inserta los datos en la tabla "estudios"
      const { data, error } = await this._supabaseClient
        .from('estudios')
        .insert({
          titulo: estudioData.titulo,
          resumen: estudioData.resumen,
          autores: estudioData.autores,
          anio: estudioData.anio,
          revista: estudioData.revista,
          doi: estudioData.doi,
          estado: estudioData.estado,
          keywords: estudioData.keywords,
          author_keywords: estudioData.author_keywords,
          bibtex_key: estudioData.bibtex_key,
          document_type: estudioData.document_type,
          paginas: estudioData.paginas,
          volumen: estudioData.volumen,
          url: estudioData.url,
          afiliacion: estudioData.afiliacion,
          publisher: estudioData.publisher,
          issn: estudioData.issn,
          language: estudioData.language,
          comentario: estudioData.comentario,
          fuente_bibliografica: estudioData.fuente_bibliografica,
          url_pdf_articulo: estudioData.url_pdf_articulo
        });

      if (error) {
        throw error;
      }
      return data;
    } catch (error: any) {
      console.error('Error insertando estudio:', error.message);
      throw error;
    }
  }

  async getAcceptedStudies(id_detalles_revision: string) {
    const { data, error } = await this._supabaseClient
      .from('estudios')
      .select('*')
      .eq('estado', 'Aceptado')
      .eq('id_detalles_revision', id_detalles_revision);
    return { data, error };
  }

  async getQualityQuestions() {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_preguntas')
      .select('*');
    return { data, error };
  }

  async getQualityAnswers() {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_respuestas')
      .select('*');
    return { data, error };
  }

  async createCalidadEstudio(calidadData: any) {
    const { data, error } = await this._supabaseClient
      .from('calidad_estudios')
      .insert([calidadData])
      .select();
    return { data, error };
  }

  // Método para obtener las evaluaciones (calidad_estudios) de un estudio dado
  async getCalidadEstudiosByStudy(id_estudios: number): Promise<any[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('calidad_estudios')
        .select('*')
        .eq('id_estudios', id_estudios);
      if (error) {
        console.error('Error al cargar evaluaciones:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Error inesperado al cargar evaluaciones:', err);
      return [];
    }
  }






  async getCriteriosByRevision(idDetallesRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('criterios')
      .select('id_criterios, descripcion, tipo')
      .eq('id_detalles_revision', idDetallesRevision)
      .order('fecha_ingreso', { ascending: true });

    if (error) throw error;
    return data;
  }

  async updateEstudioWithCriterio(estudioId: number, criterioId: number) {
    const { data, error } = await this._supabaseClient
      .from('estudios')
      .update({ id_criterio: criterioId })
      .eq('id_estudios', estudioId);

    if (error) throw error;
    return data;
  }

  async getIdCriterioDeEstudio(estudioId: number): Promise<number | null> {
    try {
      const { data, error } = await this._supabaseClient
        .from('estudios')
        .select('id_criterio')
        .eq('id_estudios', estudioId)
        .single(); // Para retornar sólo una fila

      if (error) throw error;
      // data será del tipo { id_criterios: number | null }
      if (!data) return null;

      return data.id_criterio || null;
    } catch (err) {
      console.error('Error al obtener id_criterios de estudio:', err);
      throw err;
    }
  }

  async changePassword(newPassword: string): Promise<{ error: any }> {
    // 1. Validar que haya un uid en localStorage
    const uid = localStorage.getItem('user_id');
    if (!uid) {
      return { error: 'No se encontró un UID en localStorage' };
    }

    // 2. Actualizar la contraseña en Supabase Auth
    //    Esto cambia la contraseña del "User" en la autenticación interna de Supabase.
    //    No se necesita currentPassword aquí, siempre que la sesión sea válida.
    const { data: updatedUser, error: errorAuth } = await this._supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (errorAuth) {
      console.error('Error al actualizar contraseña en Supabase Auth:', errorAuth);
      return { error: errorAuth };
    }

    // 3. Actualizar la columna "contrasena" en la tabla "usuarios" usando el uid
    //    Se asume que tu columna primaria o de referencia es "id_usuarios"
    //    Ajusta si tu tabla tiene otro nombre de columna para el ID.
    const { data: dbData, error: errorDb } = await this._supabaseClient
      .from('usuarios')
      .update({ contrasena: newPassword })
      .eq('id_usuarios', uid)
      .select(); // <-- Si deseas el registro actualizado

    if (errorDb) {
      console.error('Error al actualizar la tabla "usuarios":', errorDb);
      return { error: errorDb };
    }

    console.log('Contraseña actualizada con éxito. Registro en DB:', dbData);
    return { error: null };  // Indica que no hubo error
  }




  // =====================================
  // 1) Cargar campos de extracción por id_revision
  // =====================================
  async loadExtractionFields(id_revision: string): Promise<DataField[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('campos_extraccion')
        .select('*')
        .eq('id_revision', id_revision)
        .order('orden', { ascending: true }); // Ejemplo: ordenar por 'orden' asc.

      if (error) {
        console.error('Error al cargar campos de extracción:', error);
        return [];
      }

      // Mapear los campos a tu interfaz DataField
      const fields: DataField[] = (data || []).map((item: any) => ({
        id_extraction_field: item.id_campo_extraccion,
        id_revision: item.id_revision.toString(),
        descripcion: item.descripcion,
        tipo: item.tipo,
        orden: item.orden,
        isEditing: false // Por defecto, en modo vista
      }));
      return fields;
    } catch (err) {
      console.error('Error inesperado al cargar campos:', err);
      return [];
    }
  }

  // =====================================
  // 2) Crear (insertar) un nuevo campo
  // =====================================
  async createExtractionField(field: DataField): Promise<DataField | null> {
    try {
      const { data, error } = await this._supabaseClient
        .from('campos_extraccion')
        .insert([
          {
            id_revision: field.id_revision,
            descripcion: field.descripcion,
            tipo: field.tipo,
            orden: field.orden
          }
        ])
        .select();  // Para obtener el registro recién insertado

      if (error) {
        console.error('Error al crear el campo de extracción:', error);
        return null;
      }

      // data[0] es el objeto insertado en la BD
      if (data && data.length > 0) {
        const newItem = data[0];
        // Retorna un objeto en el formato de tu interfaz
        return {
          id_extraction_field: newItem.id_campo_extraccion,
          id_revision: newItem.id_revision.toString(),
          descripcion: newItem.descripcion,
          tipo: newItem.tipo,
          orden: newItem.orden,
          isEditing: false
        };
      }
      return null;
    } catch (err) {
      console.error('Error inesperado al crear campo:', err);
      return null;
    }
  }

  // =====================================
  // 3) Actualizar un campo existente
  // =====================================
  async updateExtractionField(field: DataField): Promise<DataField | null> {
    if (!field.id_extraction_field) {
      console.warn('No se puede actualizar un campo sin ID');
      return null;
    }

    try {
      const { data, error } = await this._supabaseClient
        .from('campos_extraccion')
        .update({
          descripcion: field.descripcion,
          tipo: field.tipo,
          orden: field.orden
        })
        .eq('id_campo_extraccion', field.id_extraction_field)
        .select();

      if (error) {
        console.error('Error al actualizar el campo de extracción:', error);
        return null;
      }

      if (data && data.length > 0) {
        const updatedItem = data[0];
        return {
          id_extraction_field: updatedItem.id_campo_extraccion,
          id_revision: updatedItem.id_revision.toString(),
          descripcion: updatedItem.descripcion,
          tipo: updatedItem.tipo,
          orden: updatedItem.orden,
          isEditing: false
        };
      }
      return null;
    } catch (err) {
      console.error('Error inesperado al actualizar campo:', err);
      return null;
    }
  }

  // =====================================
  // 4) Eliminar un campo
  // =====================================
  async deleteExtractionField(id_extraction_field: number): Promise<boolean> {
    try {
      const { error } = await this._supabaseClient
        .from('campos_extraccion')
        .delete()
        .eq('id_campo_extraccion', id_extraction_field);

      if (error) {
        console.error('Error al eliminar el campo de extracción:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error inesperado al eliminar campo:', err);
      return false;
    }
  }


  // ======================================================
  // 1) Cargar bases bibliográficas por ID de revisión
  // ======================================================
  async loadBasesBibliograficas(id_revision: string): Promise<BaseBibliografica[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('bases_bibliograficas')
        .select('*')
        .eq('id_revision', id_revision);

      if (error) {
        console.error('Error al cargar bases bibliográficas:', error);
        return [];
      }

      return (data || []).map(item => ({
        id_base_bibliografica: item.id_base_bibliografica,
        id_revision: item.id_revision.toString(),
        nombre: item.nombre,
        url: item.url,
        isEditing: false
      } as BaseBibliografica));
    } catch (err) {
      console.error('Error inesperado al cargar bases:', err);
      return [];
    }
  }

  // ======================================================
  // 2) Crear (insertar) una nueva base bibliográfica
  // ======================================================
  async createBaseBibliografica(base: BaseBibliografica): Promise<BaseBibliografica | null> {
    try {
      const { data, error } = await this._supabaseClient
        .from('bases_bibliograficas')
        .insert([
          {
            id_revision: base.id_revision,
            nombre: base.nombre,
            url: base.url
          }
        ])
        .select();

      if (error) {
        console.error('Error al crear base bibliográfica:', error);
        return null;
      }

      if (data && data.length > 0) {
        const newItem = data[0];
        return {
          id_base_bibliografica: newItem.id_base_bibliografica,
          id_revision: newItem.id_revision.toString(),
          nombre: newItem.nombre,
          url: newItem.url,
          isEditing: false
        };
      }
      return null;
    } catch (err) {
      console.error('Error inesperado al crear base:', err);
      return null;
    }
  }

  // ======================================================
  // 3) Actualizar una base bibliográfica
  // ======================================================
  async updateBaseBibliografica(base: BaseBibliografica): Promise<BaseBibliografica | null> {
    if (!base.id_base_bibliografica) {
      console.warn('No se puede actualizar, falta id_base_bibliografica');
      return null;
    }
    try {
      const { data, error } = await this._supabaseClient
        .from('bases_bibliograficas')
        .update({
          nombre: base.nombre,
          url: base.url
        })
        .eq('id_base_bibliografica', base.id_base_bibliografica)
        .select();

      if (error) {
        console.error('Error al actualizar base bibliográfica:', error);
        return null;
      }

      if (data && data.length > 0) {
        const updatedItem = data[0];
        return {
          id_base_bibliografica: updatedItem.id_base_bibliografica,
          id_revision: updatedItem.id_revision.toString(),
          nombre: updatedItem.nombre,
          url: updatedItem.url,
          isEditing: false
        };
      }
      return null;
    } catch (err) {
      console.error('Error inesperado al actualizar base:', err);
      return null;
    }
  }

  // ======================================================
  // 4) Eliminar una base bibliográfica
  // ======================================================
  async deleteBaseBibliografica(id_base_bibliografica: number): Promise<boolean> {
    try {
      const { error } = await this._supabaseClient
        .from('bases_bibliograficas')
        .delete()
        .eq('id_base_bibliografica', id_base_bibliografica);

      if (error) {
        console.error('Error al eliminar base bibliográfica:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error inesperado al eliminar base:', err);
      return false;
    }
  }


  // ======================================================
  // Traer los estudios para la extraccion de datos
  async getAcceptedStudiesAboveLimit(id_detalles_revision: string) {
    // 1. Obtener la puntuación límite de la tabla puntuaciones_evaluacion
    const { data: puntuacionData, error: errorPuntuacion } = await this._supabaseClient
      .from('puntuaciones_evaluacion')
      .select('puntuacion_limite')
      .eq('id_detalles_revision', id_detalles_revision)
      .single();

    if (errorPuntuacion || !puntuacionData) {
      console.error('Error obteniendo puntuacion_limite:', errorPuntuacion);
      return { data: [], error: errorPuntuacion };
    }

    const limite = puntuacionData.puntuacion_limite;

    // 2. Obtener los estudios aceptados de la revisión
    const { data: acceptedStudies, error: errorAccepted } = await this._supabaseClient
      .from('estudios')
      .select('*')
      .eq('estado', 'Aceptado')
      .eq('id_detalles_revision', id_detalles_revision);

    if (errorAccepted || !acceptedStudies) {
      console.error('Error obteniendo estudios aceptados:', errorAccepted);
      return { data: [], error: errorAccepted };
    }

    // 3. Para cada estudio, sumar el peso en calidad_estudios
    const finalList = [];
    for (const study of acceptedStudies) {
      const { data: calidadData, error: errorCalidad } = await this._supabaseClient
        .from('calidad_estudios')
        .select('peso')
        .eq('id_estudios', study.id_estudios);

      if (errorCalidad || !calidadData) {
        console.error('Error obteniendo peso de calidad_estudios:', errorCalidad);
        continue; // omitimos este estudio si hay error
      }

      const totalPeso = calidadData.reduce((acc: number, cur: any) => acc + (cur.peso || 0), 0);

      // 4. Verificar si totalPeso > puntuacion_limite
      if (totalPeso > limite) {
        // Agregar el campo totalPeso al objeto study, si quieres mostrarlo en la interfaz
        finalList.push({ ...study, totalPeso });
      }
    }

    return { data: finalList, error: null };
  }

  // auth.service.ts
async getExtractionFields(id_revision: string) {
  const { data, error } = await this._supabaseClient
    .from('campos_extraccion')
    .select('*')
    .eq('id_revision', id_revision)
    .order('orden', { ascending: true });
  return { data, error };
}

// auth.service.ts
async saveExtractionResponses(responses: any[]): Promise<{ data: any; error: any }> {
  const { data, error } = await this._supabaseClient
    .from('respuestas_extraccion')
    .insert(responses);
  return { data, error };
}

// auth.service.ts
async getExtractionStatusForStudies(studyIds: number[]): Promise<{ [key: number]: boolean }> {
  // Se consulta la tabla "respuestas_extraccion" para traer registros con done=true para los estudios indicados.
  const { data, error } = await this._supabaseClient
    .from('respuestas_extraccion')
    .select('id_estudios, done')
    .in('id_estudios', studyIds)
    .eq('done', true);

  if (error) {
    console.error('Error al obtener el estado de extracción:', error);
    return {};
  }

  const statusMap: { [key: number]: boolean } = {};
  // Si existe al menos un registro con done=true para un estudio, se marca como hecho.
  data.forEach((record: any) => {
    statusMap[record.id_estudios] = true;
  });
  return statusMap;
}

async getExtractionResponsesForStudies(studyIds: number[]): Promise<{ data: any; error: any }> {
  const { data, error } = await this._supabaseClient
    .from('respuestas_extraccion')
    .select('*')
    .in('id_estudios', studyIds);
  return { data, error };
}







}