import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { SupabaseService } from '../../conexion/supabase.service';
import { filter, map, Observable, startWith } from 'rxjs';
import { CountryService } from '../../conexion/country.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ReactiveFormsModule,
    MatInputModule,
    MatAutocompleteModule
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  userForm: FormGroup;
  imageFile: File | null = null;
  imageUrl: string | null = null;
  countryCtrl = new FormControl();
  filteredCountries: Observable<any[]> = new Observable();
  countries: any[] = [];
  user: string = '';
  pendingImageFile: File | null = null;
  isLargeScreen: boolean = true;

  @ViewChild(MatAutocompleteTrigger) autoTrigger: MatAutocompleteTrigger | undefined;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private supabase: SupabaseService,
    private router: Router,
    private countryService: CountryService
  ) {
    this.userForm = this.fb.group({
      nombre_usuario: [{ value: '', disabled: true }],
      nombre: [''],
      apellido: [''],
      correo_electronico: [''],
      institucion: ['']
    });
  }

  async ngOnInit() {
    this.loadUserData();


    // Nos suscribimos a NavigationEnd, que indica que la navegación ha finalizado.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Llevamos el scroll al tope
        window.scrollTo(0, 0);
      });

    this.countryService.getCountries().subscribe((data: any[]) => {
      // Ordenar alfabeticamente según el nombre común
      this.countries = data.sort((a, b) => {
        const nameA = (a.name?.common || '').toLowerCase();
        const nameB = (b.name?.common || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // Configurar el filtrado conforme se escribe
      this.filteredCountries = this.countryCtrl.valueChanges.pipe(
        startWith(''),
        map(value => this._filterCountries(value))
      );
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768; // Cambia a true si la pantalla es md o más grande
  }

  onFocus() {
    // Al hacer focus, abrimos el panel del autocompletado
    if (this.autoTrigger) {
      this.autoTrigger.openPanel();
    }
  }

  private _filterCountries(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.countries.filter(country =>
      country.name?.common?.toLowerCase().includes(filterValue)
    );
  }

  async loadUserData() {
    const session = await this.authService.getSession();
    const uid = session?.user?.id;

    if (uid) {
      const userData = await this.authService.getUserDataByUID(uid);
      this.user = userData?.nombre_usuario || '';

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
      this.pendingImageFile = file;

      // Generar una URL de previsualización sin subir aún
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageUrl = e.target.result; // Se muestra en <img [src]="imageUrl">
      };
      reader.readAsDataURL(file);
    }
  }

  async onSubmit() {
    if (this.userForm.valid) {
      const uid = localStorage.getItem('user_id');
      if (!uid) return;

      let publicUrl = '';

      // Si hay un archivo pendiente de subir, lo subes
      if (this.pendingImageFile) {
        const fileExt = this.pendingImageFile.name.split('.').pop();
        const randomName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
        const filePath = `path/to/file/${randomName}`;

        publicUrl = await this.uploadImage(this.pendingImageFile, filePath);
      }

      const userData = this.userForm.getRawValue();

      // Si subimos imagen, actualizamos la ruta_imagen
      if (publicUrl) {
        userData.ruta_imagen = publicUrl;
      }

      // Finalmente, hacemos update en supabase
      const { data, error } = await this.authService.updateUser(uid, userData);

      if (error) {
        // Hubo un error real de Supabase
        console.error('Error al actualizar los datos:', error);

        // Mostrar alerta de error con SweetAlert2
        Swal.fire({
          icon: 'error',
          title: 'Error al actualizar',
          text: 'No se pudo actualizar la información. Intenta de nuevo.',
        });

      } else {
        // No hay error => éxito (incluso si data puede ser un array vacío)
        if (!data || data.length === 0) {
          console.warn('No se actualizó ningún registro (posiblemente no exista el usuario con ese uid).');

          // Alerta informativa
          Swal.fire({
            icon: 'info',
            title: 'Usuario no encontrado',
            text: 'No se encontró registro con el UID proporcionado.',
          });
        } else {
          console.log('Datos actualizados:', data);

          // Mostrar alerta de éxito con SweetAlert2
          Swal.fire({
            icon: 'success',
            title: '¡Información actualizada!',
            text: 'La información se guardó correctamente.',
          });
        }
      }
    }
  }

  async uploadImage(file: File, filePath: string): Promise<string> {
    const { data, error } = await this.supabase.supabaseClient
      .storage
      .from('avatars')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading file:', error);
      return '';
    }

    // Obtener la URL pública
    const publicUrl = this.supabase.supabaseClient
      .storage
      .from('avatars')
      .getPublicUrl(data.path).data.publicUrl;

    return publicUrl || '';
  }



}
