import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/data-access/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  userData: any = null; // Almacena los datos del usuario

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  async loadUserData() {
    try {
      this.userData = await this.authService.getCurrentUserData();
    } catch (error) {
      console.error('Error al cargar los datos del usuario:', error);
    }
  }
}
