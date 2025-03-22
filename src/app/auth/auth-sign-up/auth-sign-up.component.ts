import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { User } from '../../modelo/usuario.model';
import { AuthService } from '../data-access/auth.service';
import { SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auth-sign-up',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './auth-sign-up.component.html',
  styleUrl: './auth-sign-up.component.css'
})
export class AuthSignUpComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  showPolicies: boolean = false;

  // Objeto para almacenar el estado (true/false) de cada política
  policyChecks = {
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  };

  // Variables para errores en el formulario
  emailError: string = '';
  otherErrors: string[] = [];
  readonly myApiKey = environment.verificEmailApiKey;

  constructor(private _authService: AuthService, private router: Router, private http: HttpClient) { }

  // Función para validar el correo usando una API externa gratuita (ej. Mailboxlayer)
  async validateEmailApi(email: string): Promise<{ valid: boolean, info: string }> {
    const apiKey = this.myApiKey;
    const url = `https://apilayer.net/api/check?access_key=${apiKey}&email=${encodeURIComponent(email)}`;
    try {
      const result: any = await this.http.get(url).toPromise();
      // Ejemplo de validación: consideramos válido si el formato es correcto y se encontró un MX.
      const valid = result.format_valid && result.mx_found;
      return { valid, info: result.error ? result.error.info : '' };
    } catch (err) {
      return { valid: false, info: 'Error al validar el correo' };
    }
  }

  // Método para verificar si el correo ya existe en la base de datos
  async emailAlreadyExists(email: string): Promise<boolean> {
    const exists = await this._authService.verifyEmailExists(email); // Implementa este método en tu servicio
    return exists;
  }

  // Función que se llama al enviar el formulario
  async handleEmailSignup() {
    this.otherErrors = [];
    this.emailError = '';
  
    // Verificar que se hayan llenado los campos básicos
    if (!this.name.trim() || !this.email.trim() || !this.password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, completa todos los campos.'
      });
      return;
    }
  
    // Validar las políticas de contraseña
    if (!this.allPoliciesMet()) {
      Swal.fire({
        icon: 'error',
        title: 'Políticas de contraseña',
        text: 'La contraseña no cumple con todas las políticas requeridas.'
      });
      return;
    }
  
    // Validar el formato del correo mediante la API externa
    const emailValidation = await this.validateEmailApi(this.email);
    if (!emailValidation.valid) {
      this.emailError = 'El correo ingresado no es válido: ' + emailValidation.info;
      Swal.fire({
        icon: 'error',
        title: 'Correo inválido',
        text: this.emailError
      });
      return;
    }
  
    // Verificar si el correo ya está registrado
    if (await this.emailAlreadyExists(this.email)) {
      this.emailError = 'El correo ya está registrado. Por favor, utiliza otro.';
      Swal.fire({
        icon: 'error',
        title: 'Correo duplicado',
        text: this.emailError
      });
      return;
    }
  
    // Si todo está correcto, procede con el registro
    try {
      const credentials: SignUpWithPasswordCredentials = {
        email: this.email,
        password: this.password,
        options: {
          data: { name: this.name }
        }
      };
  
      // Supabase signUp
      const { data: authData, error: authError } = await this._authService.signUp(credentials);
      if (authError) {
        const errorMsg = this.translateSignupError(authError);
        Swal.fire({
          icon: 'error',
          title: 'Error en el registro',
          text: errorMsg,
        });
        return;
      }
  
      // Si se crea el usuario en Supabase, guardarlo también en tu base de datos
      if (authData?.user) {
        const id_usuario = authData.user.id;
        const { error: dbError } = await this._authService.addUserToDatabase(
          id_usuario,
          this.name,
          this.email,
          this.password
        );
  
        if (dbError) {
          const errorMsg = this.translateSignupError(dbError);
          Swal.fire({
            icon: 'error',
            title: 'Error al guardar el usuario',
            text: errorMsg,
          });
          return;
        }
  
        // Si todo sale bien, guardamos el ID en localStorage y mostramos un mensaje de éxito
        localStorage.setItem('session_ID', id_usuario);
        Swal.fire({
          icon: 'success',
          title: 'Cuenta creada con éxito',
          text: 'Revisa tu correo para verificar tu cuenta.',
        }).then(() => {
          this.router.navigate(['/log-in']);
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Ocurrió un error inesperado',
        text: 'Por favor, inténtalo nuevamente.',
      });
    }
  }

  private translateSignupError(error: any): string {
    // Si no existe el error o su mensaje, devolvemos algo genérico
    if (!error || !error.message) {
      return 'Error desconocido. Por favor, inténtalo nuevamente.';
    }
  
    // Revisamos si el mensaje contiene ciertas palabras clave para identificar el error
    if (error.message.includes('duplicate key value violates unique constraint')) {
      return 'Ya existe una cuenta registrada con este correo.';
    }
  
    if (error.message.includes('email rate limit exceeded')) {
      return 'Se ha excedido el límite de envíos de correo. Por favor, intenta más tarde.';
    }

    // Caso 1: Correo duplicado
    if (error.message.includes('duplicate key value violates unique constraint "usuarios_correo_electronico_key"')) {
      return 'Ya existe un usuario registrado con este correo electrónico.';
    }
    
    // Caso 2: Límite de frecuencia
    if (error.message.includes('For security purposes, you can only request this after')) {
      return 'Por razones de seguridad, debes esperar 48 segundos antes de volver a intentarlo.';
    }
    
  
    // Si no coincide con ninguno de los anteriores, puedes:
    //  - Devolver el mensaje original
    //  - O bien, devolver un mensaje genérico en español
    return error.message; 
  }  

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  checkPasswordPolicy(): void {
    const pwd = this.password || '';
    this.policyChecks.minLength = pwd.length >= 8;
    this.policyChecks.uppercase = /[A-Z]/.test(pwd);
    this.policyChecks.lowercase = /[a-z]/.test(pwd);  // Verifica al menos una minúscula
    this.policyChecks.number = /\d/.test(pwd);
    this.policyChecks.specialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
  }

  allPoliciesMet(): boolean {
    return (
      this.policyChecks.minLength &&
      this.policyChecks.uppercase &&
      this.policyChecks.lowercase && // Se agrega esta condición
      this.policyChecks.number &&
      this.policyChecks.specialChar
    );
  }

  handleGoogleSignup() {
    // TODO: Implement Google signup
    console.log('Registro con Google iniciado.');
    // For now, just show a success message
    alert('¡Registro con Google exitoso!');
  }
}
