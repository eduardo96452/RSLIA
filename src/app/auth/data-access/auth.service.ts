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
  cadenaBusqueda?: string;  // nueva propiedad para la cadena de búsqueda
  isCadenaCopied?: boolean; // para el botón de copiar (opcional)
  cadenaGuardada?: boolean; // Indica si la cadena ya fue guardada
}

export interface Criterio {
  id_criterios?: number; // ID del criterio (puede ser indefinido al agregar nuevos)
  descripcion: string;   // Descripción del criterio
  tipo: 'exclusion' | 'inclusion'; // Tipo del criterio
  isEditing?: boolean;   // Para controlar el modo de edición en la tabla

}

export interface Pregunta {
  id_pregunta?: number;         // ID que viene de la BD
  descripcion: string;         // Texto de la pregunta
  id_detalles_revision?: number; // Si lo requieres para la relación
  isEditing?: boolean;         // Para controlar el modo de edición
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

export interface Informe {
  id_informes_generados: number;
  id_detalles_revision: string;
  nombre_informe: string;
  ruta_archivo: string;
  fecha_generacion: string;
}



@Injectable({
  providedIn: 'root'
})
export class AuthService {

  _supabaseClient = inject(SupabaseService).supabaseClient;
  private authState = new BehaviorSubject<boolean>(false);
  private router = inject(Router);  // Inyección de Router
  private inactivityTimeoutId: any;  // ID del temporizador de inactividad
  private readonly inactivityLimit = 10 * 60 * 60 * 1000; // 10 horas en milisegundos

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

  async verifyEmailExists(email: string): Promise<boolean> {
    const { data, error } = await this._supabaseClient
      .from('usuarios')
      .select('id')
      .eq('correo', email)
      .maybeSingle();

    if (error) {
      console.error('Error al verificar correo:', error);
      return false;
    }

    return !!data;
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

  async countUserInformes(userId: string): Promise<number> {
    const { count, error } = await this._supabaseClient
      .from('informes_generados')
      .select('*, detalles_revision:detalles_revision!inner(id_usuarios)', { count: 'exact', head: true })
      .eq('detalles_revision.id_usuarios', userId);

    if (error) {
      console.error('Error al contar informes generados del usuario:', error);
      return 0;
    }
    return count || 0;
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

  // Función para obtener todas las reseñas de un usuario

  async getUserReviews(userId: string) {

    const { data, error } = await this._supabaseClient
      .from('detalles_revision')
      .select('id_detalles_revision, titulo_revision, fecha_modificacion')
      .eq('id_usuarios', userId);

    if (error) {
      console.error('Error en la consulta:', error);
      return [];
    }

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

  // Función para obtener las metodologías

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

  // Parte para traer las preguntas de investigación

  async saveResearchQuestion(question: Question): Promise<any> {
    const { data, error } = await this._supabaseClient
      .from('preguntas_investigacion')
      .insert([
        {
          pregunta: question.value,
          id_detalles_revision: question.id_detalles_revision || null,
        }
      ])
      .select(); // Esto hace que se retorne el registro insertado

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

  //Parte para las palabras claves y sinonimos

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
    idseccioncomponente: string,
    fechaIngreso?: string
  ): Promise<{ data?: any; error?: any }> {
    try {
      // ======================================================
      // 0) Buscar el id_componente_revision usando el idseccioncomponente.
      // ======================================================
      const { data: compRevData, error: compRevError } = await this._supabaseClient
        .from('componente_revision')
        .select('id_componente_revision')
        .eq('id_componente', idseccioncomponente)
        .limit(1) // Limita a 1 registro
        .single();

      if (compRevError) {
        console.error('Error al buscar componente_revision:', compRevError);
        return { error: compRevError };
      }
      if (!compRevData) {
        return {
          error: new Error(`No se encontró un componente_revision con id_componente = ${idseccioncomponente}`)
        };
      }
      const foundCompRevId = compRevData.id_componente_revision;

      // ======================================================
      // 1) Insertar la palabra clave en "palabras_clave"
      // ======================================================
      const { data: kwData, error: kwError } = await this._supabaseClient
        .from('palabras_clave')
        .insert([
          {
            palabra_clave: palabraClave,
            fecha_ingreso: fechaIngreso || new Date().toISOString(),
            id_detalles_revision: idDetallesRevision,
            id_componente_revision: foundCompRevId
          }
        ])
        .select();

      if (kwError) {
        console.error('Error al insertar en palabras_clave:', kwError);
        return { error: kwError };
      }
      if (!kwData || kwData.length === 0) {
        return { error: new Error('No se pudo insertar la palabra clave.') };
      }
      const newKeyword = kwData[0];

      // ======================================================
      // 2) Insertar el sinónimo en la tabla "sinonimos" usando el id_palabras_clave obtenido
      // ======================================================
      const { data: synData, error: synError } = await this._supabaseClient
        .from('sinonimos')
        .insert([
          {
            id_palabras_clave: newKeyword.id_palabras_clave,
            sinonimo: sinonimo
          }
        ])
        .select();

      if (synError) {
        console.error('Error al insertar sinónimo:', synError);
        return { error: synError };
      }
      if (!synData || synData.length === 0) {
        return { error: new Error('No se pudo insertar el sinónimo.') };
      }

      return {
        data: {
          synonym: synData[0],
          keyword: newKeyword
        }
      };
    } catch (err) {
      console.error('Error inesperado al registrar sinónimo y palabra clave:', err);
      return { error: err };
    }
  }

  async getKeywordsAndSynonymsAdvanced(reviewId: string): Promise<any[]> {
    const { data, error } = await this._supabaseClient
      .from('palabras_clave')
      .select(`
        id_palabras_clave,
        palabra_clave,
        fecha_ingreso,
        id_detalles_revision,
        id_componente_revision,
        sinonimos!left(
          id_sinonimos,
          sinonimo
        ),
        componente_revision!left(
          id_revision,
          id_componente,
          palabra_clave,
          componente!left(
            id_componente,
            nombre,
            sigla,
            descripcion,
            id_metodologia
          )
        )
      `)
      .eq('id_detalles_revision', reviewId);

    if (error) {
      console.error("Error al cargar palabras clave y sinónimos avanzados:", error);
      return [];
    }
    return data;
  }

  async updateSynonymThenKeyword(
    idPalabraClave: number,
    idSinonimos: number,
    sinonimo: string,
    palabraClave: string,
    idDetallesRevision: string,
    idseccioncomponente: string,
    fechaIngreso: string
  ): Promise<{ data?: any; error?: any }> {
    try {
      // Buscar el id_componente_revision usando idseccioncomponente
      const { data: compRevData, error: compRevError } = await this._supabaseClient
        .from('componente_revision')
        .select('id_componente_revision')
        .eq('id_componente', idseccioncomponente)
        .order('id_componente_revision', { ascending: true })
        .limit(1)
        .single();

      if (compRevError) {
        console.error('Error al buscar componente_revision:', compRevError);
        return { error: compRevError };
      }
      if (!compRevData) {
        return { error: new Error('No se encontró un componente_revision con el id proporcionado.') };
      }
      const foundCompRevId = compRevData.id_componente_revision;

      // Actualizar el sinónimo en la tabla "sinonimos"
      const { data: updateSynData, error: updateSynError } = await this._supabaseClient
        .from('sinonimos')
        .update({ sinonimo })
        .eq('id_sinonimos', idSinonimos)
        .order('id_sinonimos', { ascending: true }) // Especificamos el orden
        .limit(1)
        .single();

      // Actualizar la palabra clave en la tabla "palabras_clave"
      const { data: updateKwData, error: updateKwError } = await this._supabaseClient
        .from('palabras_clave')
        .update({
          palabra_clave: palabraClave,
          fecha_ingreso: fechaIngreso,
          id_detalles_revision: idDetallesRevision,
          id_componente_revision: foundCompRevId
        })
        .eq('id_palabras_clave', idPalabraClave)
        .order('id_palabras_clave', { ascending: true }) // Especificamos el orden
        .limit(1)
        .single();

      if (updateKwError) {
        console.error('Error al actualizar palabra clave:', updateKwError);
        return { error: updateKwError };
      }

      return { data: { synonym: updateSynData, keyword: updateKwData } };
    } catch (err) {
      console.error('Error inesperado al actualizar sinónimo y palabra clave:', err);
      return { error: err };
    }
  }

  async deleteKeyword(idPalabrasClave: number, idSinonimos: number): Promise<{ data: any; error: any }> {
    // Primero eliminamos los sinónimos asociados al componente
    const { data: synData, error: synError } = await this._supabaseClient
      .from('sinonimos')
      .delete()
      .eq('id_sinonimos', idSinonimos);

    if (synError) {
      console.error('Error al eliminar sinónimos:', synError);
      return { data: null, error: synError };
    }

    // Luego eliminamos la palabra clave
    const { data, error } = await this._supabaseClient
      .from('palabras_clave')
      .delete()
      .eq('id_palabras_clave', idPalabrasClave);

    if (error) {
      console.error('Error al eliminar palabra clave:', error);
    }

    return { data, error };
  }

  //Funciones para la parte de bases bibliograficas

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

  //Funciones para la parte de cadenas de busqueda

  async upsertCadenaBusqueda(
    cadenaBusqueda: string,
    idDetallesRevision: string,
    fuente: string
  ): Promise<{ data: any; error: any }> {
    // Se busca el registro existente para la revisión y la fuente
    const { data: existing, error: existingError } = await this._supabaseClient
      .from('cadenas_busqueda')
      .select('*')
      .eq('id_detalles_revision', idDetallesRevision)
      .eq('fuente', fuente)
      .maybeSingle();

    if (existingError) {
      return { data: null, error: existingError };
    }

    if (existing) {
      // Actualiza el registro existente
      const { data, error } = await this._supabaseClient
        .from('cadenas_busqueda')
        .update({ cadena_busqueda: cadenaBusqueda })
        .eq('id_detalles_revision', idDetallesRevision)
        .eq('fuente', fuente)
        .maybeSingle();
      return { data, error };
    } else {
      // Inserta un nuevo registro
      const { data, error } = await this._supabaseClient
        .from('cadenas_busqueda')
        .insert([
          {
            cadena_busqueda: cadenaBusqueda,
            id_detalles_revision: idDetallesRevision,
            fuente: fuente
          }
        ])
        .maybeSingle();
      return { data, error };
    }
  }

  async getCadenaBusqueda(
    idDetallesRevision: string,
    fuente?: string
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('cadenas_busqueda')
      .select('id_cadenas_busqueda, cadena_busqueda')
      .eq('id_detalles_revision', idDetallesRevision)
      .eq('fuente', fuente)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener cadena de búsqueda:', error.message);
    }
    return { data, error };
  }

  async deleteCadenaBusqueda(idDetallesRevision: string, fuente: string): Promise<boolean> {
    const { data, error } = await this._supabaseClient
      .from('cadenas_busqueda')
      .delete()
      .eq('id_detalles_revision', idDetallesRevision)
      .eq('fuente', fuente);
    if (error) {
      console.error('Error al eliminar la cadena de búsqueda:', error.message);
      return false;
    }
    return true;
  }

  //Funciones para la parte de criterios

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

  //Funciones para la parte de preguntas de calidad
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
    // 1. Validaciones rápidas
    if (file.type !== 'application/pdf') {
      throw new Error('El archivo debe ser un PDF.');
    }
    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      throw new Error(`El PDF supera los ${MAX_MB} MB permitidos.`);
    }

    // 2. Ruta única (opcional: Date.now() para evitar colisiones)
    const filePath = `estudios/${estudioId}/${Date.now()}_${file.name}`;

    // 3. Subir al bucket "documentos"
    const { error: uploadError } = await this._supabaseClient.storage
      .from('documentos')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: 'application/pdf',
        upsert: false           // true si quieres sobre-escribir
      });

    if (uploadError) {
      throw new Error(`Supabase upload error: ${uploadError.message}`);
    }

    /* 4. Obtener URL */
    // 4a. Si el bucket es PÚBLICO (policy read*):
    const {
      data: { publicUrl }
    } = this._supabaseClient.storage
      .from('documentos')
      .getPublicUrl(filePath);
    return publicUrl;

    // 4b. Si el bucket es PRIVADO, usa signed URL:
    /*
    const { data, error } = await this._supabaseClient.storage
      .from('documentos')
      .createSignedUrl(filePath, 60 * 60); // 1 h
    if (error) throw error;
    return data.signedUrl;
    */
  }



  async updateStudy(estudioData: Partial<Estudio>): Promise<any> {
    try {
      if (!estudioData.id_estudios) {
        throw new Error('No se proporcionó id_estudios para la actualización.');
      }

      const { data, error } = await this._supabaseClient
        .from('estudios')
        .update({
          titulo: estudioData.titulo,
          resumen: estudioData.resumen,
          autores: estudioData.autores,
          anio: estudioData.anio,
          revista: estudioData.revista,
          doi: estudioData.doi,
          estado: estudioData.estado,
          // Se agrega id_criterio aquí
          id_criterio: estudioData.id_criterio,
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

  async getQualityQuestions(idDetallesRevision: string): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_preguntas')
      .select('*')
      .eq('id_detalles_revision', idDetallesRevision);
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
  // Traer los estudios para la extraccion de datos
  async getAcceptedStudiesAboveLimit(id_detalles_revision: string) {
    // 1. Obtener el valor de puntuacion_limite desde la tabla "puntuaciones_evaluacion"
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

    // 2. Obtener todos los estudios aceptados
    const { data: acceptedStudies, error: errorAccepted } = await this._supabaseClient
      .from('estudios')
      .select('*')
      .eq('estado', 'Aceptado')
      .eq('id_detalles_revision', id_detalles_revision);
    if (errorAccepted || !acceptedStudies) {
      console.error('Error obteniendo estudios aceptados:', errorAccepted);
      return { data: [], error: errorAccepted };
    }

    // 3. Para cada estudio, calcular la suma de "peso" (puntuación de calidad)
    const finalList = [];
    for (const study of acceptedStudies) {
      const { data: calidadData, error: errorCalidad } = await this._supabaseClient
        .from('calidad_estudios')
        .select('peso')
        .eq('id_estudios', study.id_estudios);
      if (errorCalidad || !calidadData) {
        console.error('Error obteniendo peso de calidad_estudios:', errorCalidad);
        continue;
      }
      const totalPeso = calidadData.reduce((acc: number, cur: any) => acc + (cur.peso || 0), 0);
      // Se agrega la propiedad "limite" para poder usarla en el componente
      finalList.push({ ...study, totalPeso, limite });
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
  async updateExtractionStatusForStudy(studyId: number, done: boolean) {
    const { data, error } = await this._supabaseClient
      .from('respuestas_extraccion')
      .update({ done: done })
      .eq('id_estudios', studyId);
    if (error) {
      console.error('Error actualizando respuestas_extraccion:', error);
      throw error;
    }
    return data;
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

  // auth.service.ts
  async getAcceptedStudie(idRevision: string) {
    const { data, error } = await this._supabaseClient
      .rpc('fn_get_studies_with_score_done', { id_revision: idRevision });

    return { data: data ?? [], error };
  }

  // auth.service.ts
  async saveSectionDraft(sectionData: {
    id_detalles_revision: string;
    introduccion?: string;
    trabajos_relacionados?: string;
    metodologia?: string;
    resultados?: string;
    discusion?: string;
    limitaciones?: string;
    conclusion?: string;
    resumen?: string;
    calidadtrabajorelacionado?: string;
    calidadmetodologia?: string;
    calidadresultados?: string;
    calidaddiscusion?: string;
    calidadlimitaciones?: string;
    calidadconclusion?: string;
    calidadintroduccion?: string;
    calidadresumen?: string;

  }): Promise<{ data: any; error: any }> {
    const { id_detalles_revision } = sectionData;

    // 1. Obtener el registro existente (si lo hay)
    let existingData: any = null;
    try {
      const existingResp = await this._supabaseClient
        .from('secciones_revision')
        .select('*')
        .eq('id_detalles_revision', id_detalles_revision)
        .single();

      existingData = existingResp.data;
      if (existingResp.error) {
        console.error('Error al obtener la sección existente:', existingResp.error);
      }
    } catch (err) {
      console.error('Excepción al obtener la sección existente:', err);
    }

    // 2. Fusionar datos: si existe un registro, copiamos sus campos; 
    //    solo sobreescribimos los campos que llegan en sectionData
    let mergedPayload: any = {};

    if (existingData) {
      // Copiamos todo lo que ya había
      mergedPayload = { ...existingData };

      // Solo actualizamos los campos que hayas enviado (no undefined)
      if (sectionData.introduccion !== undefined) {
        mergedPayload.introduccion = sectionData.introduccion;
      }
      if (sectionData.trabajos_relacionados !== undefined) {
        mergedPayload.trabajos_relacionados = sectionData.trabajos_relacionados;
      }
      if (sectionData.metodologia !== undefined) {
        mergedPayload.metodologia = sectionData.metodologia;
      }
      if (sectionData.resultados !== undefined) {
        mergedPayload.resultados = sectionData.resultados;
      }
      if (sectionData.discusion !== undefined) {
        mergedPayload.discusion = sectionData.discusion;
      }
      if (sectionData.limitaciones !== undefined) {
        mergedPayload.limitaciones = sectionData.limitaciones;
      }
      if (sectionData.conclusion !== undefined) {
        mergedPayload.conclusion = sectionData.conclusion;
      }
      if (sectionData.resumen !== undefined) {
        mergedPayload.resumen = sectionData.resumen;
      }
      if (sectionData.calidadtrabajorelacionado !== undefined) {
        mergedPayload.calidadtrabajorelacionado = sectionData.calidadtrabajorelacionado;
      }
      if (sectionData.calidadmetodologia !== undefined) {
        mergedPayload.calidadmetodologia = sectionData.calidadmetodologia;
      }
      if (sectionData.calidadresultados !== undefined) {
        mergedPayload.calidadresultados = sectionData.calidadresultados;
      }
      if (sectionData.calidaddiscusion !== undefined) {
        mergedPayload.calidaddiscusion = sectionData.calidaddiscusion;
      }
      if (sectionData.calidadlimitaciones !== undefined) {
        mergedPayload.calidadlimitaciones = sectionData.calidadlimitaciones;
      }
      if (sectionData.calidadconclusion !== undefined) {
        mergedPayload.calidadconclusion = sectionData.calidadconclusion;
      }
      if (sectionData.calidadintroduccion !== undefined) {
        mergedPayload.calidadintroduccion = sectionData.calidadintroduccion;
      }
      if (sectionData.calidadresumen !== undefined) {
        mergedPayload.calidadresumen = sectionData.calidadresumen;
      }

      // id_detalles_revision y fecha de ingreso
      mergedPayload.id_detalles_revision = id_detalles_revision;
      mergedPayload.fecha_ingreso = new Date().toISOString();
    } else {
      // Si no había registro previo, creamos uno nuevo con los campos que envías
      mergedPayload = {
        ...sectionData,
        fecha_ingreso: new Date().toISOString()
      };
    }

    // 3. Hacer upsert con mergedPayload
    const { data, error } = await this._supabaseClient
      .from('secciones_revision')
      .upsert([mergedPayload], { onConflict: 'id_detalles_revision' });

    if (error) {
      console.error('Error guardando el borrador de sección:', error);
    }

    return { data, error };
  }

  async getSectionDraft(id_detalles_revision: string): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('secciones_revision')
      .select('*')
      .eq('id_detalles_revision', id_detalles_revision)
      .single();
    if (error) {
      console.error('Error al obtener el borrador de sección:', error);
    }
    return { data, error };
  }

  // auth.service.ts
  async getIAContext(p_id_rev: number): Promise<{ data: any[]; error: any }> {
    const { data, error } = await this._supabaseClient
      .rpc('fn_get_ia_context', { p_id_rev });
    return { data, error };
  }

  async getExtractionResponsesByRevision(
    idRevision: number
  ): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await this._supabaseClient
      .rpc('fn_get_extraction_responses', { p_id_rev: idRevision });
  
    return { data, error };
  }

  async getSectionMetrics(id_detalles_revision: string) {
  const { data: estudios, error: err1 } = await this._supabaseClient
    .from('estudios')
    .select('fuente_bibliografica, estado, id_criterio')
    .eq('id_detalles_revision', id_detalles_revision);

  if (err1) throw err1;

  const totalIdentified = estudios.length;
  const duplicatesCount = estudios
    .filter(e => (e.estado || '').toLowerCase() === 'duplicado')
    .length;
  const screenedCount   = totalIdentified - duplicatesCount;
  const acceptedCount   = estudios
    .filter(e => (e.estado || '').toLowerCase() === 'aceptado')
    .length;

  // … resto idéntico …
  const perSourceMap: Record<string, number> = {};
  estudios.forEach(e => {
    const fuente = e.fuente_bibliografica || 'Desconocida';
    perSourceMap[fuente] = (perSourceMap[fuente] || 0) + 1;
  });
  const perSource = Object.entries(perSourceMap)
    .map(([fuente, count]) => ({ fuente, count }));

  const { data: criterios, error: err2 } = await this._supabaseClient
    .from('criterios')
    .select('id_criterios, descripcion')
    .eq('id_detalles_revision', id_detalles_revision)
    .eq('tipo', 'exclusion');
  if (err2) throw err2;

  const excludedByCriteria = criterios.map((c, idx) => {
    const code = `EC${idx + 1}`;
    const count = estudios.filter(e => e.id_criterio === c.id_criterios).length;
    return { code, count };  // ya no incluimos descripcion
  });

  const totalExcluded = excludedByCriteria.reduce((sum, c) => sum + c.count, 0);
  const includedCount  = Math.max(0, screenedCount - totalExcluded);

  return {
    perSource,
    totalIdentified,
    duplicatesCount,
    screenedCount,
    excludedByCriteria,
    includedCount
  };
}



  async uploadInformeDocx(file: Blob, idDetallesRevision: string): Promise<{ publicUrl: string, fileName: string } | null> {
    // Genera un nombre único para el archivo DOCX
    const randomNum = Math.floor(Math.random() * 10000);
    const fileName = `Borrador_de_Articulo_${Date.now()}-${randomNum}.docx`;
    // Construye la ruta: carpeta "informes" dentro del bucket "documentos"
    const filePath = `informes/${idDetallesRevision}/${fileName}`;

    // Subir el archivo al bucket "documentos"
    const { data, error } = await this._supabaseClient
      .storage
      .from('documentos')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.error('Error al subir el archivo:', error);
      return null;
    }

    // Obtener la URL pública del archivo; getPublicUrl retorna solo un objeto con data
    const publicUrlResult = this._supabaseClient
      .storage
      .from('documentos')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlResult.data.publicUrl;
    return { publicUrl, fileName };
  }

  async insertInformeGenerado(
    idDetallesRevision: string,
    nombreInforme: string,
    rutaArchivo: string,
    fechaGeneracion: string
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('informes_generados')
      .insert([
        {
          id_detalles_revision: idDetallesRevision,
          nombre_informe: nombreInforme,
          ruta_archivo: rutaArchivo,
          fecha_generacion: fechaGeneracion
        }
      ])
      .maybeSingle();
    return { data, error };
  }

  async deleteInformeGenerado(idInforme: number): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('informes_generados')
      .delete()
      .eq('id_informes_generados', idInforme);
    return { data, error };
  }

  async getInformesGenerados(idDetallesRevision: string): Promise<any[]> {
    const { data, error } = await this._supabaseClient
      .from('informes_generados')
      .select('*')
      .eq('id_detalles_revision', idDetallesRevision);
    if (error) {
      console.error('Error al cargar informes generados:', error);
      return [];
    }
    return data;
  }







  async uploadInforme(fileName: string, file: Blob, idDetallesRevision: string): Promise<{ data: any; error: any }> {
    // Construye la ruta: carpeta "informes" dentro del bucket "documentos"
    const path = `informes/${idDetallesRevision}/${fileName}`;
    const { data, error } = await this._supabaseClient
      .storage
      .from('documentos')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) {
      return { data: null, error };
    }
    // Obtener la URL pública del archivo
    const { data: publicUrlData } = this._supabaseClient
      .storage
      .from('documentos')
      .getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;
    if (!publicUrlData) {
      return { data: null, error: new Error('Failed to get public URL') };
    }
    return { data: { publicUrl }, error: null };
  }


  async uploadInformePdf(fileName: string, file: Blob, idDetallesRevision: string): Promise<{ data: any; error: any }> {
    // Define la ruta en el bucket, por ejemplo: informes/{idDetallesRevision}/{fileName}
    const path = `informes/${idDetallesRevision}/${fileName}`;
    const { data, error } = await this._supabaseClient
      .storage
      .from('documentos')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    return { data, error };
  }

  async insertInformeGeneradopdf(
    idDetallesRevision: string,
    nombreInforme: string,
    rutaArchivo: string,
    fechaGeneracion: string
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseClient
      .from('informes_generados')
      .insert([
        {
          id_detalles_revision: idDetallesRevision,
          nombre_informe: nombreInforme,
          ruta_archivo: rutaArchivo,
          fecha_generacion: fechaGeneracion
        }
      ])
      .maybeSingle();
    return { data, error };
  }

}