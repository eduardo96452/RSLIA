import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../conexion/supabase.service';
import { createClient, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

export interface DetallesRevision {
  id_detalles_revision: string;
  id_usuarios: string;
  titulo_revision: string;
  tipo_revision: string;
  descripcion: string;
  fecha_creacion: string;
}

export interface Question {
  id: number;
  id_estudios?: string | null;
  id_detalles_revision?: string;
  value: string;
  isSaved?: boolean;
}

export interface KeywordRow {
  id_palabras_clave?: number;
  keyword: string;      // palabra_clave
  related: string;      // seccion_metodologia
  synonyms: string;     // sinónimos separados por comas
  isEditing?: boolean;  // control de edición local
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
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  _supabaseClient = inject(SupabaseService).supabaseClient;
  private authState = new BehaviorSubject<boolean>(false);
  private router = inject(Router);  // Inyección de Router
  private inactivityTimeoutId: any;  // ID del temporizador de inactividad
  private readonly inactivityLimit = 15 * 60 * 60 * 1000; // 15 horas en milisegundos

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
      .select('id_usuarios, nombre_usuario, correo_electronico, nombre, apellido, institucion, ruta_imagen') // Selecciona las columnas que necesitas
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

  async updateUser(uid: string, userData: { nombre: string; apellido: string; correo_electronico: string; institucion: string; nombre_usuario: string }) {
    const { data, error } = await this._supabaseClient
      .from('usuarios')
      .update({
        nombre: userData.nombre,
        apellido: userData.apellido,
        correo_electronico: userData.correo_electronico,
        institucion: userData.institucion,
        nombre_usuario: userData.nombre_usuario,
      })
      .eq('id_usuarios', uid);

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

  async createReview(data: {
    id_usuarios: string;
    titulo_revision: string;
    tipo_revision: string;
    descripcion: string;
    fecha_creacion: string;
  }): Promise<{ insertData: DetallesRevision[] | null; error: any }> {
    const { data: insertData, error } = await this._supabaseClient
      .from('detalles_revision')
      .insert([data])
      .select(); // Asegúrate de que Supabase retorne los datos insertados

    if (error) {
      console.error('Error al crear la reseña:', error);
      return { insertData: null, error };
    }

    return { insertData, error };
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

  async getUserReviews(userId: string) {
    console.log('Fetching reviews for user:', userId);

    const { data, error } = await this._supabaseClient
      .from('detalles_revision')
      .select('id_detalles_revision, titulo_revision')
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
      .select('id_detalles_revision, titulo_revision, objetivo, tipo_revision, descripcion')
      .eq('id_detalles_revision', reviewId)
      .single(); // Para obtener un único registro

    if (error) {
      console.error('Error al obtener la reseña por ID:', error);
      return null;
    }
    return data;
  }

  async updateReview(reviewId: string, reviewData: { titulo_revision: string; tipo_revision: string; descripcion: string }) {
    const { data, error } = await this._supabaseClient
      .from('detalles_revision')
      .update(reviewData)
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

  async insertMetodologia(data: {
    id_detalles_revision: number | string;
    nombre_metodologia: string;
    s?: string;
    p?: string;
    i?: string;
    c?: string;
    e?: string;
    o?: string;
    c2?: string;
    t?: string;
    t2?: string;
  }) {
    const { data: insertData, error } = await this._supabaseClient
      .from('metodologias')
      .insert([data]);

    if (error) {
      console.error('Error al insertar metodología:', error);
      throw error;
    }
    return insertData;
  }

  async getMetodologiaByRevisionId(revisionId: number | string) {
    const { data, error } = await this._supabaseClient
      .from('metodologias')
      .select('*')
      .eq('id_detalles_revision', revisionId)
      .single(); // asumes que solo guardas una metodología por revisión

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = Row not found
      console.error('Error al consultar metodología:', error);
      throw error;
    }
    return data; // data será undefined/null si no existe
  }

  async deleteMetodologiaByRevisionId(revisionId: number | string) {
    const { data, error } = await this._supabaseClient
      .from('metodologias')
      .delete()
      .eq('id_detalles_revision', revisionId);

    if (error) {
      console.error('Error al eliminar metodología:', error);
      throw error;
    }
    return data;
  }

  async saveResearchQuestion(question: Question): Promise<any> {
    const { data, error } = await this._supabaseClient
      .from('preguntas_investigacion') // Nombre de la tabla
      .insert([
        {
          id_estudios: question.id_estudios || null, // Opcional: depende si tienes ID del estudio
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

  async saveKeyword(
    palabraClave: string,
    seccionMetodologia: string,
    sinonimos: string[],
    idDetallesRevision: string
  ): Promise<{ data: any; error: any }> {
    // Mapear sinónimos a cada columna
    const sinonimo1 = sinonimos[0] ?? null;
    const sinonimo2 = sinonimos[1] ?? null;
    const sinonimo3 = sinonimos[2] ?? null;
    const sinonimo4 = sinonimos[3] ?? null;
    const sinonimo5 = sinonimos[4] ?? null;

    const { data, error } = await this._supabaseClient
      .from('palabras_clave')
      .insert([
        {
          palabra_clave: palabraClave,
          seccion_metodologia: seccionMetodologia,
          id_detalles_revision: idDetallesRevision,
          sinonimo1,
          sinonimo2,
          sinonimo3,
          sinonimo4,
          sinonimo5
          // fecha_ingreso puede tener default en la BD
        }
      ]);

    if (error) {
      console.error('Error al insertar palabra clave:', error.message);
    }
    return { data, error };
  }

  async updateKeyword(
    idPalabrasClave: number,
    palabraClave: string,
    seccionMetodologia: string,
    sinonimos: string[],
    idDetallesRevision: string
  ): Promise<{ data: any; error: any }> {
    // Similar mapeo de sinónimos
    const sinonimo1 = sinonimos[0] ?? null;
    const sinonimo2 = sinonimos[1] ?? null;
    const sinonimo3 = sinonimos[2] ?? null;
    const sinonimo4 = sinonimos[3] ?? null;
    const sinonimo5 = sinonimos[4] ?? null;

    const { data, error } = await this._supabaseClient
      .from('palabras_clave')
      .update({
        palabra_clave: palabraClave,
        seccion_metodologia: seccionMetodologia,
        id_detalles_revision: idDetallesRevision,
        sinonimo1,
        sinonimo2,
        sinonimo3,
        sinonimo4,
        sinonimo5
      })
      .eq('id_palabras_clave', idPalabrasClave);

    if (error) {
      console.error('Error al actualizar palabra clave:', error.message);
    }
    return { data, error };
  }

  async getKeywordsByRevision(idRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('palabras_clave')
      .select('*')
      .eq('id_detalles_revision', idRevision);

    if (error) {
      console.error('Error al obtener palabras clave:', error.message);
    }
    return { data, error };
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

  // Obtiene todas las preguntas para una revisión
  async getPreguntasByRevision(idRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_preguntas')
      .select('*')
      .eq('id_detalles_revision', idRevision);

    return { data, error };
  }

  // Inserta una nueva pregunta
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

  // Actualiza la descripción de una pregunta
  async updatePregunta(idPregunta: number, nuevaDescripcion: string) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_preguntas')
      .update({ descripcion: nuevaDescripcion })
      .eq('id_pregunta', idPregunta)
      .select();

    return { data, error };
  }

  // Elimina una pregunta
  async deletePregunta(idPregunta: number) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_preguntas')
      .delete()
      .eq('id_pregunta', idPregunta)
      .select();

    return { data, error };
  }

  // Obtiene todas las respuestas para una revisión
  async getRespuestasByRevision(idRevision: string) {
    const { data, error } = await this._supabaseClient
      .from('evaluacion_calidad_respuestas')
      .select('*')
      .eq('id_detalles_revision', idRevision);

    return { data, error };
  }

  // Inserta una nueva respuesta
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

  // Actualiza la descripción y/o peso de una respuesta
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

  // Elimina una respuesta
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
    newLimit: number
  ): Promise<{ data: any; error: any }> {
    // Verificar si ya existe
    const { data: existingData, error: existingError } = await this._supabaseClient
      .from('puntuaciones_evaluacion')
      .select('*')
      .eq('id_detalles_revision', idRevision);

    // existingData es un array
    if (existingData && existingData.length > 0) {
      const row = existingData[0]; // Toma la primera (o la que necesites)
      // Ahora row.id_puntuacion existe
      const { data, error } = await this._supabaseClient
        .from('puntuaciones_evaluacion')
        .update({ puntuacion_limite: newLimit })
        .eq('id_puntuacion', row.id_puntuacion)
        .select();

      return { data, error };
    } else {
      // Crea una nueva fila con puntuacion_maxima = 3.0 por default
      const { data, error } = await this._supabaseClient
        .from('puntuaciones_evaluacion')
        .insert([
          {
            puntuacion_limite: newLimit,
            // puntuacion_maxima: 3.0 se asigna por DEFAULT en la BD
            id_detalles_revision: idRevision
          }
        ])
        .select();

      return { data, error };
    }
  }

}