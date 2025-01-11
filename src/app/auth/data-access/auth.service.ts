import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../conexion/supabase.service';
import { createClient, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  _supabaseClient = inject(SupabaseService).supabaseClient;
  private authState = new BehaviorSubject<boolean>(false);

  constructor() {
    // Actualiza el estado de autenticación según el estado de la sesión de Supabase
    this._supabaseClient.auth.onAuthStateChange((event, session) => {
      this.authState.next(!!session);
      
    });
  }

  async getSession() {
    const { data: { session } } = await this._supabaseClient.auth.getSession();
    return session;
  }

  isAuthenticated(): Observable<boolean> {
    return this.authState.asObservable();
  }

  
  signUp(credentials: SignUpWithPasswordCredentials){
    return this._supabaseClient.auth.signUp(credentials);
  }


  logIn(credentials:{ email: string; password: string }){
    return this._supabaseClient.auth.signInWithPassword(credentials);
  }


  signOut(){
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

  async createReview(data: { id_usuarios: string; titulo_revision: string; tipo_revision: string; descripcion: string; fecha_creacion: string }) {
    const { data: insertData, error } = await this._supabaseClient
      .from('detalles_revision') // Asegúrate de que sea el nombre correcto de tu tabla
      .insert([data]);
  
    if (error) {
      console.error('Error al crear la reseña:', error);
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
  
}