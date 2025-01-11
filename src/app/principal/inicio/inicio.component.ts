import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from "../footer/footer.component";

interface BlogPost {
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent {
  blogPosts: BlogPost[] = [
    {
      title: "Introducción a las Revisiones Sistemáticas",
      excerpt: "Descubre cómo las revisiones sistemáticas están transformando la investigación académica...",
      author: "María García",
      date: "2024-03-15",
      readTime: "5 min"
    },
    {
      title: "Mejores Prácticas en la Metodología de Investigación",
      excerpt: "Aprende las técnicas más efectivas para llevar a cabo una investigación rigurosa y confiable...",
      author: "Carlos Rodríguez",
      date: "2024-03-10",
      readTime: "7 min"
    },
    {
      title: "El Futuro de la Publicación Académica",
      excerpt: "Explora cómo la tecnología está cambiando la forma en que compartimos y accedemos al conocimiento científico...",
      author: "Ana Martínez",
      date: "2024-03-05",
      readTime: "6 min"
    }
  ];
}
