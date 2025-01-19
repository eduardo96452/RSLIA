import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { NavbarComponent } from '../../principal/navbar/navbar.component';
import { SupabaseService } from '../../conexion/supabase.service';
import { FooterComponent } from "../../principal/footer/footer.component";

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, ReactiveFormsModule, FooterComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  userForm: FormGroup;
  imageFile: File | null = null;
  imageUrl: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService, private supabase: SupabaseService) {
    this.userForm = this.fb.group({
      nombre_usuario: [{ value: '', disabled: true }],
      nombre: [''],
      apellido: [''],
      correo_electronico: [''],
      institucion: ['']
    });
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  async loadUserData() {
    const session = await this.authService.getSession();
    const uid = session?.user?.id;
  
    if (uid) {
      const userData = await this.authService.getUserDataByUID(uid);
  
      if (userData && Object.keys(userData).length > 0) { // Verificar que userData no sea undefined y tenga datos
        this.userForm.patchValue({
          nombre_usuario: userData.nombre_usuario || '', // Default a '' si está undefined
          nombre: userData.nombre || '',
          apellido: userData.apellido || '',
          correo_electronico: userData.correo_electronico || '',
          institucion: userData.institucion || ''
        });
        this.imageUrl = userData.ruta_imagen;
      } else {
        console.error('No se encontraron datos para el usuario.');
      }
    } else {
      console.error('No se encontró una sesión válida.');
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.imageFile = file;
    }
  }
  
  // Esta es la función de tu servicio para subir la imagen
async uploadImage(file: File): Promise<string> {
  const { data, error } = await this.supabase.supabaseClient
    .storage
    .from('avatars') // Nombre del bucket
    .upload(`path/to/file/${file.name}`, file);

  if (error) {
    console.error('Error uploading file:', error);
    return '';
  }

  // Obtén la URL pública del archivo recién subido
  const publicUrl = this.supabase.supabaseClient
    .storage
    .from('avatars')
    .getPublicUrl(data.path).data.publicUrl; // 'data.path' contiene la ruta del archivo

  return publicUrl || ''; // Devuelve la URL pública
}

  async updateUserProfileImage(imageUrl: string) {
    const uid = localStorage.getItem('user_id');
    
    if (uid) {
      const { data, error } = await this.authService.updateUser(uid, {
        ...this.userForm.value,
        ruta_imagen: imageUrl
      });
      if (data) {
        alert('Imagen de perfil actualizada');
      } else {
        console.error('Error al actualizar imagen:', error);
      }
    }
  }

  async onSubmit() {
    if (this.userForm.valid) {
      const uid = localStorage.getItem('user_id');

      if (uid) {
        const userData = this.userForm.getRawValue();
        const { data, error } = await this.authService.updateUser(uid, userData);
        if (data) {
          alert('Datos actualizados correctamente.');
        } else {
          console.error('Error al actualizar los datos:', error);
        }
      }
    }
  }
}
