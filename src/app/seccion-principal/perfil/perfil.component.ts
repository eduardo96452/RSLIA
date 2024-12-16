import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  isSidebarOpen = true;
  searchQuery = '';
  activeMenuItem = 'Descripción General';
  isUserMenuOpen = false;
  profileImage: string | null = null;
  isModalOpen = false;

  userInfo = {
    nombre_usuario: '',
    nombre: '',
    apellido: '',
    correo_electronico: '',
    institucion: '',
  };

  constructor(private _authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  openImageModal() {
    this.isModalOpen = true;
  }

  closeImageModal() {
    this.isModalOpen = false;
  }

  async loadUserData() {
    const session = await this._authService.getSession();
    if (session) {
      const userData = await this._authService.getUserDataByUID(session.user.id);
      if (userData) {
        this.userInfo = {
          nombre_usuario: userData.nombre_usuario,
          nombre: userData.nombre,
          apellido: userData.apellido,
          correo_electronico: userData.correo_electronico,
          institucion: userData.institucion,
        };
      }
    }
  }

  menuItems = [
    { name: 'Descripción General', icon: 'LayoutDashboard' },
    { name: 'Planificación', icon: 'Calendar' },
    { name: 'Revisión de datos', icon: 'FileText' },
    { name: 'Proyección informes', icon: 'PieChart' },
  ];

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  handleSearch() {
    console.log('Searching for:', this.searchQuery);
    alert(`Searching for: ${this.searchQuery}`);
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  handleProfile() {
    console.log('Viewing profile');
    this.router.navigate(['/Perfil']);
  }

  handleLogout() {
    console.log('Logging out');
    alert('Logging out');
  }

  handleMenuItemClick(itemName: string) {
    this.activeMenuItem = itemName;

    // Redirige a '/Inicio/Descripción_General' si el nombre del elemento es "Descripción General"
    if (itemName === 'Descripción General') {
      this.router.navigate(['/Descripción_General']);
    }
  }

  handleImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.profileImage = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  handleSubmit() {
    console.log('User info submitted:', this.userInfo);
    alert('Perfil actualizado correctamente');
  }
}
