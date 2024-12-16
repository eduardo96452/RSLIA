import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../conexion/supabase.service';
import { SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private _supabaseClient = inject(SupabaseService).supabaseClient;
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

  // Nueva función para agregar el usuario a la base de datos
  async addUserToDatabase(id_usuario: string, nombre: string, correo_electronico: string, contrasena: string) {
    const { data, error } = await this._supabaseClient
      .from('usuarios') // Nombre de la tabla en Supabase
      .insert([
        {
          id_usuarios: id_usuario,
          nombre_usuario: nombre, // Ajusta si es el campo de "nombre" o "nombre_usuario"
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

  async addRevisionDetails(uid: string, titulo: string, tipo: string, descripcion: string) {
    const { data, error } = await this._supabaseClient
      .from('detalle_revision')
      .insert([
        {
          id_usuarios: uid,
          titulo_revision: titulo,
          tipo_revision: tipo,
          descripcion: descripcion,
        }
      ]);
  
    if (error) {
      console.error('Error al insertar los datos de revisión:', error);
      return null;
    }
    return data;
  }
}