import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { SupabaseService } from '../../conexion/supabase.service';
import { filter, map, Observable, startWith } from 'rxjs';
import { CountryService } from '../../conexion/country.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  userForm: FormGroup;
  imageFile: File | null = null;
  imageUrl: string | null = null;

  searchText: string = '';
  countries: any[] = [];
  filteredCountries: any[] = [];
  dropdownVisible: boolean = false; // Controla la visibilidad del dropdown


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

  ngOnInit(): void {
    this.loadUserData();

    // Nos suscribimos a NavigationEnd, que indica que la navegación ha finalizado.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Llevamos el scroll al tope
        window.scrollTo(0, 0);
      });

      this.countryService.getCountries().subscribe((data: any[]) => {
        // Ordena alfabéticamente usando el nombre común
        this.countries = data.sort((a, b) =>
          a.name?.common.localeCompare(b.name?.common)
        );
        // Inicialmente no mostramos ningún resultado en el dropdown
        this.filteredCountries = [];
      });
  }

  // Muestra el dropdown y filtra la lista en función del valor actual
  showDropdown(): void {
    this.dropdownVisible = true;
    this.filterCountries();
  }

  // Filtra los países según el texto ingresado y los mantiene ordenados
  filterCountries(): void {
    const filterValue = this.searchText.toLowerCase();
    this.filteredCountries = this.countries.filter(country =>
      country.name?.common.toLowerCase().includes(filterValue)
    );
  }

  // Al seleccionar un país, coloca su nombre en el input y oculta el dropdown
  selectCountry(country: any): void {
    this.searchText = country.name.common;
    this.filteredCountries = [];
    this.dropdownVisible = false;
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
